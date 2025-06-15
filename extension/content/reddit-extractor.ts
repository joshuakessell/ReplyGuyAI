/**
 * Reddit Content Extraction Service
 * Reads Reddit post and comment data directly from the DOM
 */

import { Logger } from '../utils/logger';
import { ErrorHandler, ErrorCode } from '../utils/error-handler';
import type { RedditPost } from '../types/reddit';

export class RedditExtractor {
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor() {
    this.logger = new Logger('RedditExtractor');
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Extract Reddit post or comment data from current page
   */
  extractCurrentContent(): RedditPost | null {
    try {
      this.logger.debug('Starting content extraction from current page');

      // Check if we're on a Reddit page
      if (!this.isRedditPage()) {
        throw new Error('Not on a Reddit page');
      }

      // Determine if we're looking at a post or comment
      const isCommentPage = this.isCommentPage();
      
      if (isCommentPage) {
        return this.extractCommentData();
      } else {
        return this.extractPostData();
      }

    } catch (error) {
      this.errorHandler.handle(error as Error, 'Content extraction');
      return null;
    }
  }

  /**
   * Check if current page is a Reddit page
   */
  private isRedditPage(): boolean {
    return window.location.hostname.includes('reddit.com');
  }

  /**
   * Check if we're on a comment page (individual post view)
   */
  private isCommentPage(): boolean {
    return window.location.pathname.includes('/comments/');
  }

  /**
   * Extract post data from Reddit post page
   */
  private extractPostData(): RedditPost {
    this.logger.debug('Extracting post data');

    // Try multiple selectors for different Reddit layouts
    const postSelectors = [
      '[data-testid="post-content"]',
      '[data-click-id="body"]',
      '.Post',
      '[data-test-id="post-content"]'
    ];

    let postElement: Element | null = null;
    for (const selector of postSelectors) {
      postElement = document.querySelector(selector);
      if (postElement) break;
    }

    if (!postElement) {
      throw new Error('Could not find post content element');
    }

    const title = this.extractTitle(postElement);
    const content = this.extractPostContent(postElement);
    const author = this.extractAuthor(postElement);
    const subreddit = this.extractSubreddit();
    const { upvotes, comments } = this.extractEngagementMetrics(postElement);

    return {
      id: this.generateIdFromUrl(),
      title,
      content,
      author,
      subreddit,
      upvotes,
      comments,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      type: 'post'
    };
  }

  /**
   * Extract comment data from Reddit comment
   */
  private extractCommentData(): RedditPost {
    this.logger.debug('Extracting comment data');

    // Get the main post title for context
    const title = this.extractTitle() || 'Reddit Comment';
    
    // Find the target comment (usually highlighted or focused)
    const commentSelectors = [
      '[data-testid="comment"]',
      '.Comment',
      '[data-test-id="comment"]'
    ];

    let commentElement: Element | null = null;
    for (const selector of commentSelectors) {
      const comments = document.querySelectorAll(selector);
      // Try to find a highlighted or focused comment
      commentElement = Array.from(comments).find(el => 
        el.classList.contains('highlighted') || 
        el.classList.contains('focus') ||
        el.querySelector('.highlight')
      ) || comments[0];
      if (commentElement) break;
    }

    if (!commentElement) {
      throw new Error('Could not find comment content');
    }

    const content = this.extractCommentContent(commentElement);
    const author = this.extractAuthor(commentElement);
    const subreddit = this.extractSubreddit();

    return {
      id: this.generateIdFromUrl(),
      title: `Comment on: ${title}`,
      content,
      author,
      subreddit,
      upvotes: this.extractCommentUpvotes(commentElement),
      comments: 0, // Comments don't have sub-comments count in this context
      url: window.location.href,
      timestamp: new Date().toISOString(),
      type: 'comment'
    };
  }

  /**
   * Extract title from various Reddit layouts
   */
  private extractTitle(context?: Element): string {
    const titleSelectors = [
      '[data-test-id="post-content"] h1',
      '[data-testid="post-content"] h1',
      'h1[data-testid="post-title"]',
      '.Post-title',
      'h1.title',
      '[slot="title"]',
      '.title a'
    ];

    const searchContext = context || document;

    for (const selector of titleSelectors) {
      const element = searchContext.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback to page title
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'Reddit') {
      return pageTitle.replace(' : r/', '').replace(' - Reddit', '');
    }

    throw new Error('Could not extract post title');
  }

  /**
   * Extract post content (text, not images/links)
   */
  private extractPostContent(postElement: Element): string {
    const contentSelectors = [
      '[data-test-id="post-content"] .RichTextJSON-root',
      '[data-testid="post-content"] [data-click-id="text"]',
      '.Post-body .RichTextJSON-root',
      '.usertext-body',
      '[data-test-id="post-content"] p'
    ];

    for (const selector of contentSelectors) {
      const element = postElement.querySelector(selector);
      if (element?.textContent?.trim()) {
        return this.cleanTextContent(element.textContent);
      }
    }

    // Look for any text content within the post
    const textNodes = this.getTextNodes(postElement);
    if (textNodes.length > 0) {
      return textNodes.map(node => node.textContent?.trim()).filter(Boolean).join(' ');
    }

    return 'No text content available';
  }

  /**
   * Extract comment content
   */
  private extractCommentContent(commentElement: Element): string {
    const contentSelectors = [
      '.usertext-body p',
      '[data-testid="comment"] p',
      '.Comment-body p',
      '.md p'
    ];

    for (const selector of contentSelectors) {
      const element = commentElement.querySelector(selector);
      if (element?.textContent?.trim()) {
        return this.cleanTextContent(element.textContent);
      }
    }

    // Fallback to any text content
    const textContent = commentElement.textContent?.trim();
    if (textContent) {
      return this.cleanTextContent(textContent);
    }

    throw new Error('Could not extract comment content');
  }

  /**
   * Extract author username
   */
  private extractAuthor(context?: Element): string {
    const authorSelectors = [
      '[data-testid="post_author_link"]',
      '.author',
      '[data-test-id="post-content"] .author',
      'a[href*="/user/"]',
      'a[href*="/u/"]'
    ];

    const searchContext = context || document;

    for (const selector of authorSelectors) {
      const element = searchContext.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim().replace(/^u\//, '');
      }
    }

    return 'unknown';
  }

  /**
   * Extract subreddit name
   */
  private extractSubreddit(): string {
    // Try to get from URL first
    const urlMatch = window.location.pathname.match(/\/r\/([^\/]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try DOM selectors
    const subredditSelectors = [
      '[data-testid="subreddit-name"]',
      '.subreddit-name',
      'a[href*="/r/"]'
    ];

    for (const selector of subredditSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim().replace(/^r\//, '');
      }
    }

    return 'unknown';
  }

  /**
   * Extract engagement metrics (upvotes, comments)
   */
  private extractEngagementMetrics(context: Element): { upvotes: number; comments: number } {
    let upvotes = 0;
    let comments = 0;

    // Upvotes
    const upvoteSelectors = [
      '[data-testid="vote-arrows"] [aria-label*="upvote"]',
      '.score',
      '[aria-label*="upvote"]'
    ];

    for (const selector of upvoteSelectors) {
      const element = context.querySelector(selector);
      if (element?.textContent) {
        const parsed = this.parseNumber(element.textContent);
        if (parsed !== null) {
          upvotes = parsed;
          break;
        }
      }
    }

    // Comments count
    const commentSelectors = [
      '[data-click-id="comments"]',
      '.comments',
      'a[href*="comments"] span'
    ];

    for (const selector of commentSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        const parsed = this.parseNumber(element.textContent);
        if (parsed !== null) {
          comments = parsed;
          break;
        }
      }
    }

    return { upvotes, comments };
  }

  /**
   * Extract upvotes for a comment
   */
  private extractCommentUpvotes(commentElement: Element): number {
    const upvoteSelectors = [
      '.score',
      '[aria-label*="point"]',
      '[data-testid="comment-upvote-count"]'
    ];

    for (const selector of upvoteSelectors) {
      const element = commentElement.querySelector(selector);
      if (element?.textContent) {
        const parsed = this.parseNumber(element.textContent);
        if (parsed !== null) {
          return parsed;
        }
      }
    }

    return 0;
  }

  /**
   * Generate unique ID from URL
   */
  private generateIdFromUrl(): string {
    const url = window.location.href;
    const urlHash = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    return `reddit_${urlHash}_${Date.now()}`;
  }

  /**
   * Parse number from text (handles "1.2k", "10M" format)
   */
  private parseNumber(text: string): number | null {
    const cleaned = text.replace(/[^\d.kKmM]/g, '');
    if (!cleaned) return null;

    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    if (cleaned.toLowerCase().includes('k')) {
      return Math.round(num * 1000);
    }
    if (cleaned.toLowerCase().includes('m')) {
      return Math.round(num * 1000000);
    }

    return Math.round(num);
  }

  /**
   * Clean text content by removing extra whitespace and unwanted characters
   */
  private cleanTextContent(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }

  /**
   * Get all text nodes from an element
   */
  private getTextNodes(element: Element): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent?.trim()) {
        textNodes.push(node as Text);
      }
    }

    return textNodes;
  }
}