import { 
  users, 
  redditPosts, 
  aiReplies,
  type User, 
  type InsertUser,
  type RedditPost,
  type InsertRedditPost,
  type AiReply,
  type InsertAiReply
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Reddit posts
  getRedditPost(id: number): Promise<RedditPost | undefined>;
  getRedditPostByUrl(url: string): Promise<RedditPost | undefined>;
  createRedditPost(post: InsertRedditPost): Promise<RedditPost>;
  
  // AI replies
  getAiReply(id: number): Promise<AiReply | undefined>;
  getAiRepliesByPostId(postId: number): Promise<AiReply[]>;
  createAiReply(reply: InsertAiReply): Promise<AiReply>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private redditPosts: Map<number, RedditPost>;
  private aiReplies: Map<number, AiReply>;
  private currentUserId: number;
  private currentPostId: number;
  private currentReplyId: number;

  constructor() {
    this.users = new Map();
    this.redditPosts = new Map();
    this.aiReplies = new Map();
    this.currentUserId = 1;
    this.currentPostId = 1;
    this.currentReplyId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getRedditPost(id: number): Promise<RedditPost | undefined> {
    return this.redditPosts.get(id);
  }

  async getRedditPostByUrl(url: string): Promise<RedditPost | undefined> {
    return Array.from(this.redditPosts.values()).find(
      (post) => post.url === url,
    );
  }

  async createRedditPost(insertPost: InsertRedditPost): Promise<RedditPost> {
    const id = this.currentPostId++;
    const post: RedditPost = { 
      ...insertPost, 
      id, 
      createdAt: new Date() 
    };
    this.redditPosts.set(id, post);
    return post;
  }

  async getAiReply(id: number): Promise<AiReply | undefined> {
    return this.aiReplies.get(id);
  }

  async getAiRepliesByPostId(postId: number): Promise<AiReply[]> {
    return Array.from(this.aiReplies.values()).filter(
      (reply) => reply.postId === postId,
    );
  }

  async createAiReply(insertReply: InsertAiReply): Promise<AiReply> {
    const id = this.currentReplyId++;
    const reply: AiReply = { 
      ...insertReply, 
      id, 
      createdAt: new Date() 
    };
    this.aiReplies.set(id, reply);
    return reply;
  }
}

export const storage = new MemStorage();
