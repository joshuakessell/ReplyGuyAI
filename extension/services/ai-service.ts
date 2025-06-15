/**
 * AI Service for Reddit Reply Generation
 * Handles OpenAI API communication with enterprise-grade error handling and retry logic
 */

import { Logger } from '../utils/logger';
import { ErrorHandler, ErrorCode } from '../utils/error-handler';
import type { RedditPost, CustomizationOptions, AiReply } from '../types/reddit';

export class AIService {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private baseUrl = 'https://api.openai.com/v1';
  private maxRetries = 3;
  private retryDelay = 1000; // Base delay in milliseconds

  constructor() {
    this.logger = new Logger('AIService');
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Generate AI reply for Reddit content
   */
  async generateReply(
    post: RedditPost, 
    customization: CustomizationOptions, 
    apiKey: string
  ): Promise<AiReply> {
    this.logger.info('Generating AI reply', { 
      postId: post.id, 
      customization: { ...customization, apiKey: '[REDACTED]' }
    });

    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    try {
      const prompt = this.buildPrompt(post, customization);
      const response = await this.makeAPIRequest(prompt, customization, apiKey);
      
      const reply: AiReply = {
        content: response.content,
        wordCount: this.countWords(response.content),
        estimatedReadTime: this.calculateReadTime(response.content),
        generatedAt: new Date().toISOString()
      };

      this.logger.info('AI reply generated successfully', {
        wordCount: reply.wordCount,
        readTime: reply.estimatedReadTime
      });

      return reply;

    } catch (error) {
      this.errorHandler.handle(error as Error, 'AI reply generation', {
        postId: post.id,
        customization
      });
      throw error;
    }
  }

  /**
   * Build the prompt for OpenAI based on Reddit content and customization
   */
  private buildPrompt(post: RedditPost, customization: CustomizationOptions): string {
    const targetWordCount = this.getTargetWordCount(customization);
    const moodDescription = this.getMoodDescription(customization);
    const toneDescription = this.getToneDescription(customization.tone);

    return `You are an expert Reddit user crafting an authentic reply. Analyze the following Reddit ${post.type} and generate a thoughtful response.

**Reddit ${post.type.toUpperCase()}:**
Subreddit: r/${post.subreddit}
Author: u/${post.author}
Title: ${post.title}
Content: ${post.content}
Engagement: ${post.upvotes} upvotes, ${post.comments} comments

**Reply Requirements:**
- Direction: ${customization.direction}
- Mood/Style: ${moodDescription}
- Tone: ${toneDescription}
- Target length: ${targetWordCount} words (approximately)
- Write as a helpful Reddit community member
- Match Reddit's conversational style and culture
- Be authentic and engaging
- Avoid corporate or overly promotional language

**Important Guidelines:**
- Only return the reply content, no additional text
- Use natural Reddit formatting (line breaks, emphasis where appropriate)
- Consider the subreddit context and community norms
- Be respectful while maintaining the requested mood/tone
- Make it feel like a genuine human response

Generate the reply now:`;
  }

  /**
   * Make API request to OpenAI with retry logic
   */
  private async makeAPIRequest(
    prompt: string, 
    customization: CustomizationOptions, 
    apiKey: string
  ): Promise<{ content: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(`API request attempt ${attempt}/${this.maxRetries}`);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'RedditReplyAI/2.0'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at crafting authentic, engaging Reddit replies that match the platform\'s culture and tone. Always respond naturally and helpfully.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: this.getMaxTokens(customization),
            temperature: this.getTemperature(customization),
            presence_penalty: 0.1,
            frequency_penalty: 0.1
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenAI API');
        }

        const content = data.choices[0].message.content.trim();
        
        if (!content) {
          throw new Error('Empty response from OpenAI API');
        }

        return { content };

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`API request attempt ${attempt} failed`, { error: lastError.message });

        // Don't retry on certain error types
        if (this.shouldNotRetry(lastError)) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to get response from OpenAI API');
  }

  /**
   * Determine if error should not be retried
   */
  private shouldNotRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Don't retry authentication or permission errors
    if (message.includes('401') || message.includes('403') || message.includes('invalid api key')) {
      return true;
    }
    
    // Don't retry bad request errors
    if (message.includes('400') || message.includes('bad request')) {
      return true;
    }

    return false;
  }

  /**
   * Get target word count based on customization
   */
  private getTargetWordCount(customization: CustomizationOptions): number {
    switch (customization.length) {
      case 'small':
        return 25;
      case 'medium':
        return 75;
      case 'large':
        return 150;
      case 'custom':
        return customization.customLength || 75;
      default:
        return 75;
    }
  }

  /**
   * Get max tokens for OpenAI request
   */
  private getMaxTokens(customization: CustomizationOptions): number {
    const targetWords = this.getTargetWordCount(customization);
    // Roughly 1.3 tokens per word, with buffer
    return Math.max(50, Math.min(1000, Math.round(targetWords * 1.8)));
  }

  /**
   * Get temperature for creativity control
   */
  private getTemperature(customization: CustomizationOptions): number {
    switch (customization.mood) {
      case 'witty':
        return 0.8; // Higher creativity for humor
      case 'analytical':
        return 0.3; // Lower creativity for analysis
      case 'professional':
        return 0.4; // Moderate creativity
      default:
        return 0.6; // Balanced creativity
    }
  }

  /**
   * Get mood description for prompt
   */
  private getMoodDescription(customization: CustomizationOptions): string {
    switch (customization.mood) {
      case 'witty':
        return 'Clever and humorous, using wit and light humor where appropriate';
      case 'supportive':
        return 'Encouraging and helpful, offering support and understanding';
      case 'analytical':
        return 'Thoughtful and logical, breaking down points systematically';
      case 'casual':
        return 'Relaxed and conversational, as if talking to a friend';
      case 'professional':
        return 'Polished and informative, maintaining professional standards';
      case 'custom':
        return customization.customMood || 'Natural and authentic';
      default:
        return 'Natural and authentic';
    }
  }

  /**
   * Get tone description for prompt
   */
  private getToneDescription(tone: string): string {
    switch (tone) {
      case 'formal':
        return 'Formal and structured language';
      case 'informal':
        return 'Casual and relaxed language';
      case 'neutral':
        return 'Balanced and moderate language';
      default:
        return 'Appropriate to the context';
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate estimated reading time (words per minute)
   */
  private calculateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = this.countWords(text);
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    return /^sk-[a-zA-Z0-9]{48,}$/.test(apiKey);
  }

  /**
   * Test API key validity
   */
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'RedditReplyAI/2.0'
        }
      });

      return response.ok;
    } catch (error) {
      this.logger.warn('API key test failed', { error: (error as Error).message });
      return false;
    }
  }
}