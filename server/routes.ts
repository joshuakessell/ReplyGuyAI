import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  redditUrlSchema, 
  generateReplySchema,
  type RedditPost,
  type AiReply
} from "@shared/schema";
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "your-api-key-here"
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Fetch Reddit content
  app.post("/api/reddit/fetch", async (req, res) => {
    try {
      const { url } = redditUrlSchema.parse(req.body);
      
      // Check if we already have this post
      const existingPost = await storage.getRedditPostByUrl(url);
      if (existingPost) {
        return res.json(existingPost);
      }
      
      // Extract Reddit post/comment data
      const redditData = await fetchRedditContent(url);
      
      // Store the Reddit post
      const post = await storage.createRedditPost({
        url,
        title: redditData.title,
        content: redditData.content,
        author: redditData.author,
        subreddit: redditData.subreddit,
        upvotes: redditData.upvotes,
        comments: redditData.comments,
      });
      
      res.json(post);
    } catch (error) {
      console.error("Error fetching Reddit content:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch Reddit content" 
      });
    }
  });

  // Generate AI reply
  app.post("/api/reply/generate", async (req, res) => {
    try {
      const { redditUrl, customization } = generateReplySchema.parse(req.body);
      
      // Get the Reddit post
      const post = await storage.getRedditPostByUrl(redditUrl);
      if (!post) {
        return res.status(404).json({ message: "Reddit post not found. Please fetch it first." });
      }
      
      // Generate AI reply
      const aiReply = await generateAIReply(post, customization);
      
      // Store the AI reply
      const reply = await storage.createAiReply({
        postId: post.id,
        content: aiReply.content,
        direction: customization.direction,
        mood: customization.mood === 'custom' ? customization.customMood : customization.mood,
        length: customization.length,
        wordCount: aiReply.wordCount,
      });
      
      res.json(reply);
    } catch (error) {
      console.error("Error generating AI reply:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate AI reply" 
      });
    }
  });

  // Get replies for a post
  app.get("/api/reply/:postId", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const replies = await storage.getAiRepliesByPostId(postId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching replies:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch replies" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to fetch Reddit content
async function fetchRedditContent(url: string): Promise<{
  title: string;
  content: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: number;
}> {
  try {
    // Convert Reddit URL to JSON API format
    const jsonUrl = url.replace(/\/$/, '') + '.json';
    
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'RedditReplyAI/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Reddit content: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle different Reddit URL formats
    let postData;
    if (Array.isArray(data)) {
      // This is a post with comments
      postData = data[0].data.children[0].data;
    } else if (data.data && data.data.children) {
      // This is a listing
      postData = data.data.children[0].data;
    } else {
      throw new Error("Unexpected Reddit API response format");
    }
    
    return {
      title: postData.title || "Reddit Comment",
      content: postData.selftext || postData.body || "No content available",
      author: postData.author || "unknown",
      subreddit: postData.subreddit || "unknown",
      upvotes: postData.ups || 0,
      comments: postData.num_comments || 0,
    };
  } catch (error) {
    console.error("Error fetching from Reddit API:", error);
    throw new Error("Failed to fetch Reddit content. Please check the URL and try again.");
  }
}

// Helper function to generate AI reply using OpenAI
async function generateAIReply(post: RedditPost, customization: any): Promise<{
  content: string;
  wordCount: number;
}> {
  try {
    // Determine target word count
    let targetWords: number;
    switch (customization.length) {
      case 'small':
        targetWords = 20;
        break;
      case 'medium':
        targetWords = 50;
        break;
      case 'long':
        targetWords = 100;
        break;
      case 'custom':
        targetWords = customization.customLength || 50;
        break;
      default:
        targetWords = 50;
    }
    
    // Determine mood/tone
    const mood = customization.mood === 'custom' ? 
      customization.customMood : 
      customization.mood;
    
    // Create the prompt
    const prompt = `You are helping someone craft a thoughtful Reddit reply. Here's the context:

**Original Post:**
Title: ${post.title}
Content: ${post.content}
Subreddit: r/${post.subreddit}
Author: u/${post.author}

**Reply Requirements:**
- Direction: ${customization.direction}
- Tone/Mood: ${mood}
- Target length: approximately ${targetWords} words
- Write as if you're a helpful Reddit user responding naturally
- Be authentic and engaging
- Match the conversational style of Reddit

Generate a reply that follows these requirements exactly. Only return the reply content, nothing else.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert at crafting engaging, helpful Reddit replies that match the tone and style of the platform. Always write naturally and authentically."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: Math.max(targetWords * 2, 100),
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim() || "Failed to generate reply";
    const wordCount = content.split(/\s+/).length;

    return {
      content,
      wordCount
    };
  } catch (error) {
    console.error("Error generating AI reply:", error);
    throw new Error("Failed to generate AI reply. Please try again.");
  }
}
