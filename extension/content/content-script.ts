/**
 * Content Script for Reddit Reply AI Extension
 * Injects reply generator UI into Reddit pages and handles user interactions
 */

import { RedditExtractor } from './reddit-extractor';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import type { RedditPost, CustomizationOptions, AiReply } from '../types/reddit';

class RedditReplyAI {
  private extractor: RedditExtractor;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private isInjected = false;
  private currentPost: RedditPost | null = null;
  private uiContainer: HTMLElement | null = null;

  constructor() {
    this.extractor = new RedditExtractor();
    this.logger = new Logger('ContentScript');
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Initialize the content script
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Reddit Reply AI content script');

      // Wait for page to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Check if we're on a Reddit page
      if (!this.isRedditPage()) {
        this.logger.debug('Not on a Reddit page, exiting');
        return;
      }

      // Inject UI after a short delay to ensure page is fully loaded
      setTimeout(() => {
        this.injectUI();
        this.setupObservers();
      }, 1000);

      // Listen for messages from background script
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    } catch (error) {
      this.errorHandler.handle(error as Error, 'Content script initialization');
    }
  }

  /**
   * Check if current page is a Reddit page
   */
  private isRedditPage(): boolean {
    return window.location.hostname.includes('reddit.com');
  }

  /**
   * Inject the reply generator UI into the page
   */
  private injectUI(): void {
    try {
      if (this.isInjected) return;

      this.logger.debug('Injecting reply generator UI');

      // Find the best location to inject the UI
      const targetElement = this.findInjectionTarget();
      if (!targetElement) {
        this.logger.warn('Could not find suitable injection target');
        return;
      }

      // Create UI container
      this.uiContainer = this.createUIContainer();
      
      // Insert before the target element
      targetElement.parentNode?.insertBefore(this.uiContainer, targetElement);

      this.isInjected = true;
      this.logger.info('UI injected successfully');

    } catch (error) {
      this.errorHandler.handle(error as Error, 'UI injection');
    }
  }

  /**
   * Find the best location to inject the UI
   */
  private findInjectionTarget(): Element | null {
    // Try different selectors for different Reddit layouts
    const selectors = [
      '[data-testid="comment-submission-form-richtext"]', // New Reddit
      '.usertext-edit', // Old Reddit
      '[data-test-id="comment-submission-form"]',
      '.submit-form',
      '.commentform',
      '.comment-form'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        this.logger.debug('Found injection target', { selector });
        return element;
      }
    }

    // Fallback: look for any form or comment area
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      if (form.innerHTML.toLowerCase().includes('comment')) {
        return form;
      }
    }

    return null;
  }

  /**
   * Create the main UI container
   */
  private createUIContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'reddit-reply-ai-container';
    container.style.cssText = `
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin: 16px 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
      z-index: 1000;
    `;

    // Detect dark mode
    if (this.isDarkMode()) {
      container.style.background = '#1a1a1b';
      container.style.borderColor = '#343536';
      container.style.color = '#d7dadc';
    }

    container.innerHTML = this.getUIHTML();
    this.attachEventListeners(container);

    return container;
  }

  /**
   * Get the HTML for the UI
   */
  private getUIHTML(): string {
    return `
      <div id="rai-header" style="
        background: linear-gradient(135deg, #ff4500 0%, #ff6b35 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px 8px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span style="font-weight: 600;">Reddit Reply AI</span>
        </div>
        <button id="rai-minimize" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        ">−</button>
      </div>

      <div id="rai-content" style="padding: 20px;">
        <div id="rai-step-1" class="rai-step">
          <button id="rai-detect-content" style="
            background: #0079d3;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            width: 100%;
            margin-bottom: 16px;
          ">📖 Analyze Current Reddit Content</button>
          
          <div id="rai-content-preview" style="display: none;">
            <div style="
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 6px;
              padding: 16px;
              margin-bottom: 16px;
            ">
              <h4 style="margin: 0 0 8px 0; color: #1a1a1b;">Detected Content:</h4>
              <div id="rai-content-text" style="font-size: 14px; color: #7c7c83;"></div>
              <div id="rai-content-meta" style="font-size: 12px; color: #878a8c; margin-top: 8px;"></div>
            </div>
            <button id="rai-proceed" style="
              background: #46d160;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              width: 100%;
            ">✨ Generate AI Reply</button>
          </div>
        </div>

        <div id="rai-step-2" class="rai-step" style="display: none;">
          <h3 style="margin: 0 0 16px 0; color: #1a1a1b;">Customize Your Reply</h3>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1b;">
              What direction should your reply take?
            </label>
            <textarea id="rai-direction" placeholder="e.g., Provide helpful advice, Share a different perspective, Ask follow-up questions..." style="
              width: 100%;
              padding: 12px;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              resize: vertical;
              min-height: 80px;
              font-family: inherit;
              box-sizing: border-box;
            "></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1b;">Length</label>
              <select id="rai-length" style="
                width: 100%;
                padding: 12px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                background: white;
              ">
                <option value="small">Short (~25 words)</option>
                <option value="medium" selected>Medium (~75 words)</option>
                <option value="large">Long (~150 words)</option>
                <option value="custom">Custom</option>
              </select>
              <input id="rai-custom-length" type="number" min="10" max="300" value="75" style="
                width: 100%;
                padding: 8px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                margin-top: 8px;
                display: none;
              " placeholder="Word count">
            </div>

            <div>
              <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1b;">Mood</label>
              <select id="rai-mood" style="
                width: 100%;
                padding: 12px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                background: white;
              ">
                <option value="supportive" selected>Supportive</option>
                <option value="witty">Witty</option>
                <option value="analytical">Analytical</option>
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="custom">Custom</option>
              </select>
              <input id="rai-custom-mood" type="text" style="
                width: 100%;
                padding: 8px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                margin-top: 8px;
                display: none;
              " placeholder="Describe the mood">
            </div>
          </div>

          <div style="display: flex; gap: 12px;">
            <button id="rai-back" style="
              background: #878a8c;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              flex: 1;
            ">← Back</button>
            <button id="rai-generate" style="
              background: #ff4500;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              flex: 2;
            ">🚀 Generate Reply</button>
          </div>
        </div>

        <div id="rai-step-3" class="rai-step" style="display: none;">
          <h3 style="margin: 0 0 16px 0; color: #1a1a1b;">Generated Reply</h3>
          
          <div id="rai-reply-container" style="
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 16px;
          ">
            <div id="rai-reply-text" style="
              font-size: 14px;
              line-height: 1.5;
              color: #1a1a1b;
              white-space: pre-wrap;
            "></div>
            <div id="rai-reply-stats" style="
              font-size: 12px;
              color: #878a8c;
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px solid #e9ecef;
            "></div>
          </div>

          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button id="rai-copy" style="
              background: #46d160;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              flex: 1;
              min-width: 120px;
            ">📋 Copy</button>
            <button id="rai-regenerate" style="
              background: #0079d3;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              flex: 1;
              min-width: 120px;
            ">🔄 Regenerate</button>
            <button id="rai-new" style="
              background: #878a8c;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              flex: 1;
              min-width: 120px;
            ">✨ New Reply</button>
          </div>
        </div>

        <div id="rai-loading" style="display: none; text-align: center; padding: 40px;">
          <div style="
            display: inline-block;
            width: 32px;
            height: 32px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #ff4500;
            border-radius: 50%;
            animation: rai-spin 1s linear infinite;
          "></div>
          <p style="margin: 16px 0 0 0; color: #878a8c;">Generating your AI reply...</p>
        </div>

        <div id="rai-error" style="display: none;">
          <div style="
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 16px;
          ">
            <h4 style="margin: 0 0 8px 0; color: #d32f2f;">Error</h4>
            <p id="rai-error-message" style="margin: 0; color: #d32f2f;"></p>
          </div>
          <button id="rai-retry" style="
            background: #ff4500;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            width: 100%;
          ">🔄 Try Again</button>
        </div>
      </div>

      <style>
        @keyframes rai-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        [data-theme="dark"] #reddit-reply-ai-container {
          background: #1a1a1b !important;
          border-color: #343536 !important;
          color: #d7dadc !important;
        }
        
        [data-theme="dark"] #reddit-reply-ai-container h3,
        [data-theme="dark"] #reddit-reply-ai-container h4,
        [data-theme="dark"] #reddit-reply-ai-container label {
          color: #d7dadc !important;
        }
        
        [data-theme="dark"] #reddit-reply-ai-container textarea,
        [data-theme="dark"] #reddit-reply-ai-container select,
        [data-theme="dark"] #reddit-reply-ai-container input {
          background: #272729 !important;
          border-color: #343536 !important;
          color: #d7dadc !important;
        }
        
        [data-theme="dark"] #rai-content-preview > div,
        [data-theme="dark"] #rai-reply-container {
          background: #272729 !important;
          border-color: #343536 !important;
        }
      </style>
    `;
  }

  /**
   * Check if dark mode is enabled
   */
  private isDarkMode(): boolean {
    return document.documentElement.hasAttribute('data-theme') ||
           document.body.classList.contains('dark') ||
           window.getComputedStyle(document.body).backgroundColor === 'rgb(26, 26, 27)';
  }

  /**
   * Attach event listeners to UI elements
   */
  private attachEventListeners(container: HTMLElement): void {
    // Minimize/maximize
    const minimizeBtn = container.querySelector('#rai-minimize') as HTMLElement;
    const content = container.querySelector('#rai-content') as HTMLElement;
    let isMinimized = false;

    minimizeBtn?.addEventListener('click', () => {
      isMinimized = !isMinimized;
      content.style.display = isMinimized ? 'none' : 'block';
      minimizeBtn.textContent = isMinimized ? '+' : '−';
    });

    // Content detection
    const detectBtn = container.querySelector('#rai-detect-content') as HTMLElement;
    detectBtn?.addEventListener('click', () => this.detectContent());

    // Proceed to customization
    const proceedBtn = container.querySelector('#rai-proceed') as HTMLElement;
    proceedBtn?.addEventListener('click', () => this.showCustomization());

    // Length selection
    const lengthSelect = container.querySelector('#rai-length') as HTMLSelectElement;
    const customLengthInput = container.querySelector('#rai-custom-length') as HTMLElement;
    
    lengthSelect?.addEventListener('change', () => {
      customLengthInput.style.display = lengthSelect.value === 'custom' ? 'block' : 'none';
    });

    // Mood selection
    const moodSelect = container.querySelector('#rai-mood') as HTMLSelectElement;
    const customMoodInput = container.querySelector('#rai-custom-mood') as HTMLElement;
    
    moodSelect?.addEventListener('change', () => {
      customMoodInput.style.display = moodSelect.value === 'custom' ? 'block' : 'none';
    });

    // Navigation
    const backBtn = container.querySelector('#rai-back') as HTMLElement;
    backBtn?.addEventListener('click', () => this.showStep(1));

    // Generate reply
    const generateBtn = container.querySelector('#rai-generate') as HTMLElement;
    generateBtn?.addEventListener('click', () => this.generateReply());

    // Copy reply
    const copyBtn = container.querySelector('#rai-copy') as HTMLElement;
    copyBtn?.addEventListener('click', () => this.copyReply());

    // Regenerate
    const regenerateBtn = container.querySelector('#rai-regenerate') as HTMLElement;
    regenerateBtn?.addEventListener('click', () => this.regenerateReply());

    // New reply
    const newBtn = container.querySelector('#rai-new') as HTMLElement;
    newBtn?.addEventListener('click', () => this.startNew());

    // Retry on error
    const retryBtn = container.querySelector('#rai-retry') as HTMLElement;
    retryBtn?.addEventListener('click', () => this.generateReply());
  }

  /**
   * Detect content from current Reddit page
   */
  private async detectContent(): Promise<void> {
    try {
      this.logger.debug('Detecting Reddit content');
      
      this.currentPost = this.extractor.extractCurrentContent();
      
      if (!this.currentPost) {
        throw new Error('Could not extract content from this page. Make sure you\'re on a Reddit post or comment.');
      }

      // Show content preview
      this.showContentPreview(this.currentPost);
      
    } catch (error) {
      this.showError((error as Error).message);
    }
  }

  /**
   * Show content preview
   */
  private showContentPreview(post: RedditPost): void {
    const preview = this.uiContainer?.querySelector('#rai-content-preview') as HTMLElement;
    const textEl = this.uiContainer?.querySelector('#rai-content-text') as HTMLElement;
    const metaEl = this.uiContainer?.querySelector('#rai-content-meta') as HTMLElement;

    if (!preview || !textEl || !metaEl) return;

    const truncatedContent = post.content.length > 200 
      ? post.content.substring(0, 200) + '...'
      : post.content;

    textEl.textContent = `"${truncatedContent}"`;
    metaEl.textContent = `${post.type} by u/${post.author} in r/${post.subreddit} • ${post.upvotes} upvotes`;

    preview.style.display = 'block';
  }

  /**
   * Show customization step
   */
  private showCustomization(): void {
    this.showStep(2);
  }

  /**
   * Generate AI reply
   */
  private async generateReply(): Promise<void> {
    try {
      if (!this.currentPost) {
        throw new Error('No content detected. Please analyze content first.');
      }

      this.showLoading();

      const customization = this.getCustomizationFromForm();
      
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPLY',
        data: {
          post: this.currentPost,
          customization
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate reply');
      }

      this.showReply(response.data);

    } catch (error) {
      this.showError((error as Error).message);
    }
  }

  /**
   * Get customization options from form
   */
  private getCustomizationFromForm(): CustomizationOptions {
    const directionEl = this.uiContainer?.querySelector('#rai-direction') as HTMLTextAreaElement;
    const lengthEl = this.uiContainer?.querySelector('#rai-length') as HTMLSelectElement;
    const customLengthEl = this.uiContainer?.querySelector('#rai-custom-length') as HTMLInputElement;
    const moodEl = this.uiContainer?.querySelector('#rai-mood') as HTMLSelectElement;
    const customMoodEl = this.uiContainer?.querySelector('#rai-custom-mood') as HTMLInputElement;

    return {
      direction: directionEl?.value || '',
      length: lengthEl?.value as any || 'medium',
      customLength: lengthEl?.value === 'custom' ? parseInt(customLengthEl?.value) : undefined,
      mood: moodEl?.value as any || 'supportive',
      customMood: moodEl?.value === 'custom' ? customMoodEl?.value : undefined,
      tone: 'neutral'
    };
  }

  /**
   * Show AI reply
   */
  private showReply(reply: AiReply): void {
    const textEl = this.uiContainer?.querySelector('#rai-reply-text') as HTMLElement;
    const statsEl = this.uiContainer?.querySelector('#rai-reply-stats') as HTMLElement;

    if (!textEl || !statsEl) return;

    textEl.textContent = reply.content;
    statsEl.textContent = `${reply.wordCount} words • ~${reply.estimatedReadTime} min read • Generated at ${new Date(reply.generatedAt).toLocaleTimeString()}`;

    this.showStep(3);
  }

  /**
   * Copy reply to clipboard
   */
  private async copyReply(): Promise<void> {
    try {
      const textEl = this.uiContainer?.querySelector('#rai-reply-text') as HTMLElement;
      if (!textEl) return;

      await navigator.clipboard.writeText(textEl.textContent || '');
      
      const copyBtn = this.uiContainer?.querySelector('#rai-copy') as HTMLElement;
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      }

    } catch (error) {
      this.logger.warn('Failed to copy to clipboard', { error: (error as Error).message });
    }
  }

  /**
   * Regenerate reply with same settings
   */
  private async regenerateReply(): Promise<void> {
    await this.generateReply();
  }

  /**
   * Start new reply process
   */
  private startNew(): void {
    this.currentPost = null;
    this.showStep(1);
    
    // Reset form
    const form = this.uiContainer?.querySelector('#rai-direction') as HTMLTextAreaElement;
    if (form) form.value = '';
  }

  /**
   * Show specific step
   */
  private showStep(step: number): void {
    const steps = this.uiContainer?.querySelectorAll('.rai-step') as NodeListOf<HTMLElement>;
    const loading = this.uiContainer?.querySelector('#rai-loading') as HTMLElement;
    const error = this.uiContainer?.querySelector('#rai-error') as HTMLElement;

    steps?.forEach((el, index) => {
      el.style.display = index + 1 === step ? 'block' : 'none';
    });

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    const steps = this.uiContainer?.querySelectorAll('.rai-step') as NodeListOf<HTMLElement>;
    const loading = this.uiContainer?.querySelector('#rai-loading') as HTMLElement;
    const error = this.uiContainer?.querySelector('#rai-error') as HTMLElement;

    steps?.forEach(el => el.style.display = 'none');
    if (loading) loading.style.display = 'block';
    if (error) error.style.display = 'none';
  }

  /**
   * Show error state
   */
  private showError(message: string): void {
    const steps = this.uiContainer?.querySelectorAll('.rai-step') as NodeListOf<HTMLElement>;
    const loading = this.uiContainer?.querySelector('#rai-loading') as HTMLElement;
    const error = this.uiContainer?.querySelector('#rai-error') as HTMLElement;
    const errorMessage = this.uiContainer?.querySelector('#rai-error-message') as HTMLElement;

    steps?.forEach(el => el.style.display = 'none');
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;

    this.logger.error('UI Error displayed', { message });
  }

  /**
   * Setup observers for dynamic content
   */
  private setupObservers(): void {
    // Re-inject UI if page changes dynamically
    const observer = new MutationObserver((mutations) => {
      let shouldReinject = false;

      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // Check if our UI was removed
          if (!document.contains(this.uiContainer)) {
            shouldReinject = true;
          }
        }
      });

      if (shouldReinject) {
        this.isInjected = false;
        setTimeout(() => this.injectUI(), 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Handle messages from background script
   */
  private handleMessage(request: any, sender: any, sendResponse: (response: any) => void): void {
    switch (request.type) {
      case 'SHOW_REPLY_GENERATOR':
        this.showStep(1);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }
}

// Initialize the content script
const redditReplyAI = new RedditReplyAI();
redditReplyAI.initialize();