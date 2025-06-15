import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const redditPosts = pgTable("reddit_posts", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author"),
  subreddit: text("subreddit"),
  upvotes: integer("upvotes").default(0),
  comments: integer("comments").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiReplies = pgTable("ai_replies", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => redditPosts.id),
  content: text("content").notNull(),
  direction: text("direction"),
  mood: text("mood"),
  length: text("length"),
  wordCount: integer("word_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reddit URL validation schema
export const redditUrlSchema = z.object({
  url: z.string().url().refine(
    (url) => url.includes('reddit.com'),
    { message: "Must be a valid Reddit URL" }
  ),
});

// Customization schema
export const customizationSchema = z.object({
  direction: z.string().min(1, "Direction is required"),
  length: z.enum(["small", "medium", "long", "custom"]),
  customLength: z.number().min(5).max(500).optional(),
  mood: z.enum(["witty", "comforting", "sad", "custom"]),
  customMood: z.string().optional(),
});

// Generate reply request schema
export const generateReplySchema = z.object({
  redditUrl: z.string().url(),
  customization: customizationSchema,
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRedditPostSchema = createInsertSchema(redditPosts).omit({
  id: true,
  createdAt: true,
});

export const insertAiReplySchema = createInsertSchema(aiReplies).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RedditPost = typeof redditPosts.$inferSelect;
export type AiReply = typeof aiReplies.$inferSelect;
export type InsertRedditPost = z.infer<typeof insertRedditPostSchema>;
export type InsertAiReply = z.infer<typeof insertAiReplySchema>;
export type CustomizationData = z.infer<typeof customizationSchema>;
export type GenerateReplyRequest = z.infer<typeof generateReplySchema>;
