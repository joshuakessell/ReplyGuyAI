/**
 * Type definitions for Reddit data structures and API interfaces
 */

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  url: string;
  timestamp: string;
  type: 'post' | 'comment';
}

export interface CustomizationOptions {
  direction: string;
  length: 'small' | 'medium' | 'large' | 'custom';
  customLength?: number;
  mood: 'witty' | 'supportive' | 'analytical' | 'casual' | 'professional' | 'custom';
  customMood?: string;
  tone: 'formal' | 'informal' | 'neutral';
}

export interface AiReply {
  content: string;
  wordCount: number;
  estimatedReadTime: number;
  generatedAt: string;
}

export interface GenerateReplyRequest {
  post: RedditPost;
  customization: CustomizationOptions;
}

export interface ExtensionSettings {
  openaiApiKey: string;
  defaultCustomization: Partial<CustomizationOptions>;
  autoDetectContext: boolean;
  saveHistory: boolean;
  darkMode: boolean;
}

export interface ReplyHistory {
  id: string;
  postId: string;
  postTitle: string;
  reply: string;
  customization: CustomizationOptions;
  timestamp: string;
  wordCount: number;
  subreddit: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthCheckResult {
  timestamp: string;
  apiKeyConfigured: boolean;
  storageHealthy: boolean;
  extensionVersion: string;
  lastError?: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}