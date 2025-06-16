/**
 * Content Script for ReplyGuy.AI Extension
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

      // Setup context menu detection for textboxes
      setTimeout(() => {
        this.setupContextMenuDetection();
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
   * Setup context menu detection for textboxes
   */
  private setupContextMenuDetection(): void {
    try {
      // Store reference to active textbox for context menu
      document.addEventListener('contextmenu', (event) => {
        const target = event.target as Element;
        if (this.isReplyTextbox(target)) {
          // Store the textbox reference for context menu action
          (window as any).replyGuyActiveTextbox = target;
          this.logger.debug('Context menu on reply textbox detected');
        } else {
          (window as any).replyGuyActiveTextbox = null;
        }
      });
      
      this.logger.info('Context menu detection setup complete');
      
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Context menu detection setup');
    }
  }

  /**
   * Check if element is a reply textbox
   */
  private isReplyTextbox(element: Element): boolean {
    if (!element) return false;
    
    const textboxSelectors = [
      '[data-testid="comment-submission-form-richtext"]',
      'textarea[placeholder*="comment"]',
      'textarea[placeholder*="reply"]',
      '.usertext-edit textarea',
      '[contenteditable="true"][data-testid*="comment"]',
      '.public-DraftEditor-content',
      'div[role="textbox"]'
    ];
    
    return textboxSelectors.some(selector => 
      element.matches(selector) || element.closest(selector)
    );
  }

  /**
   * Find all reply textboxes on Reddit
   */
  private findReplyTextboxes(): Element[] {
    const textboxSelectors = [
      '[data-testid="comment-submission-form-richtext"]', // New Reddit comment boxes
      'textarea[placeholder*="comment"]', // General comment textareas
      'textarea[placeholder*="reply"]', // Reply textareas
      '.usertext-edit textarea', // Old Reddit
      '[contenteditable="true"][data-testid*="comment"]', // New Reddit rich text
      '.public-DraftEditor-content', // Rich text editors
      'div[role="textbox"]' // Contenteditable divs
    ];

    const textboxes: Element[] = [];
    textboxSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Avoid duplicates and ensure it's visible
        if (!textboxes.includes(el) && this.isElementVisible(el)) {
          textboxes.push(el);
        }
      });
    });

    return textboxes;
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Attach hover events to a textbox
   */
  private attachHoverEvents(textbox: Element): void {
    // Skip if already has hover events
    if (textbox.hasAttribute('data-replyguy-hover')) {
      return;
    }
    
    textbox.setAttribute('data-replyguy-hover', 'true');
    
    let hoverTimeout: number;
    let promptElement: HTMLElement | null = null;
    
    const showPrompt = () => {
      if (promptElement) return; // Already showing
      
      promptElement = this.createHoverPrompt(textbox);
      textbox.parentElement?.appendChild(promptElement);
      
      // Dim the textbox
      (textbox as HTMLElement).style.filter = 'brightness(0.7)';
      (textbox as HTMLElement).style.transition = 'filter 0.2s ease';
    };
    
    const hidePrompt = () => {
      if (promptElement) {
        promptElement.remove();
        promptElement = null;
      }
      
      // Restore textbox brightness
      (textbox as HTMLElement).style.filter = '';
    };
    
    // Mouse enter - show prompt after delay
    textbox.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(showPrompt, 800); // Show after 800ms hover
    });
    
    // Mouse leave - hide prompt
    textbox.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      hidePrompt();
    });
    
    // Focus - hide prompt (user is typing)
    textbox.addEventListener('focus', () => {
      clearTimeout(hoverTimeout);
      hidePrompt();
    });
  }

  /**
   * Create hover prompt element
   */
  private createHoverPrompt(textbox: Element): HTMLElement {
    const prompt = document.createElement('div');
    prompt.className = 'replyguy-hover-prompt';
    
    const rect = textbox.getBoundingClientRect();
    prompt.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 121, 211, 0.95);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 121, 211, 0.3);
      backdrop-filter: blur(4px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      user-select: none;
      transition: all 0.2s ease;
    `;
    
    prompt.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a6 6 0 0 0-6 6c0 1.5.5 2.9 1.3 4L2 13.5l1.5-1.3C4.9 13.5 6.4 14 8 14s3.1-.5 4.2-1.8L13.5 13.5l-1.3-1.5A6 6 0 0 0 8 2zm0 1a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5zm-2 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM8 9c-.5 0-1 .2-1.4.6-.4.4-.6.9-.6 1.4h4c0-.5-.2-1-.6-1.4C9 9.2 8.5 9 8 9z"/>
        </svg>
        <span>Use ReplyGuy.AI?</span>
      </div>
    `;
    
    // Add hover effects
    prompt.addEventListener('mouseenter', () => {
      prompt.style.background = 'rgba(0, 121, 211, 1)';
      prompt.style.transform = 'translate(-50%, -50%) scale(1.05)';
    });
    
    prompt.addEventListener('mouseleave', () => {
      prompt.style.background = 'rgba(0, 121, 211, 0.95)';
      prompt.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Click handler
    prompt.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showReplyModal(textbox);
      prompt.remove();
      (textbox as HTMLElement).style.filter = '';
    });
    
    return prompt;
  }

  /**
   * Show reply customization modal
   */
  private showReplyModal(textbox: Element): void {
    // Extract content context from the page
    this.currentPost = this.extractor.extractCurrentContent();
    
    if (!this.currentPost) {
      this.logger.warn('Could not extract context for reply generation');
      return;
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'replyguy-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;
    
    // Create modal content
    const modal = this.createCustomizationModal();
    overlay.appendChild(modal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Close on escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(overlay);
    
    // Store reference to textbox for later use
    (modal as any).targetTextbox = textbox;
  }

  /**
   * Create customization modal
   */
  private createCustomizationModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'replyguy-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px 0; color: #1a1a1b; font-size: 20px; font-weight: 600;">Generate AI Reply</h2>
        <p style="margin: 0; color: #7c7c83; font-size: 14px;">Customize your reply settings below</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: #1a1a1b; font-weight: 500;">Reply Length</label>
        <select id="modal-length" style="width: 100%; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
          <option value="small">Short (~25 words)</option>
          <option value="medium" selected>Medium (~75 words)</option>
          <option value="large">Long (~150 words)</option>
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: #1a1a1b; font-weight: 500;">Tone</label>
        <select id="modal-tone" style="width: 100%; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
          <option value="neutral" selected>Neutral</option>
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="enthusiastic">Enthusiastic</option>
          <option value="skeptical">Skeptical</option>
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: #1a1a1b; font-weight: 500;">Mood</label>
        <select id="modal-mood" style="width: 100%; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
          <option value="supportive" selected>Supportive</option>
          <option value="curious">Curious</option>
          <option value="helpful">Helpful</option>
          <option value="thoughtful">Thoughtful</option>
          <option value="humorous">Humorous</option>
          <option value="serious">Serious</option>
        </select>
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button id="modal-cancel" style="flex: 1; padding: 12px; border: 1px solid #e0e0e0; background: white; color: #7c7c83; border-radius: 6px; font-weight: 500; cursor: pointer;">Cancel</button>
        <button id="modal-generate" style="flex: 2; padding: 12px; border: none; background: #0079d3; color: white; border-radius: 6px; font-weight: 500; cursor: pointer;">
          <span id="generate-text">Generate Reply</span>
          <div id="generate-loading" style="display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </button>
      </div>
    `;
    
    // Add event listeners
    const cancelBtn = modal.querySelector('#modal-cancel') as HTMLElement;
    const generateBtn = modal.querySelector('#modal-generate') as HTMLElement;
    
    cancelBtn.addEventListener('click', () => {
      modal.closest('.replyguy-modal-overlay')?.remove();
    });
    
    generateBtn.addEventListener('click', () => {
      this.generateReplyFromModal(modal);
    });
    
    return modal;
  }

  /**
   * Generate reply from modal settings
   */
  private async generateReplyFromModal(modal: HTMLElement): Promise<void> {
    try {
      const generateText = modal.querySelector('#generate-text') as HTMLElement;
      const generateLoading = modal.querySelector('#generate-loading') as HTMLElement;
      const generateBtn = modal.querySelector('#modal-generate') as HTMLButtonElement;
      
      // Show loading
      generateText.style.display = 'none';
      generateLoading.style.display = 'block';
      generateBtn.disabled = true;
      
      // Get customization options
      const lengthSelect = modal.querySelector('#modal-length') as HTMLSelectElement;
      const toneSelect = modal.querySelector('#modal-tone') as HTMLSelectElement;
      const moodSelect = modal.querySelector('#modal-mood') as HTMLSelectElement;
      
      const customization: CustomizationOptions = {
        length: lengthSelect.value as any,
        tone: toneSelect.value as any,
        mood: moodSelect.value as any,
        direction: 'supportive'
      };
      
      // Generate reply via background script
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPLY',
        data: {
          post: this.currentPost,
          customization
        }
      });
      
      if (response.success) {
        this.insertReplyIntoTextbox((modal as any).targetTextbox, response.reply.content);
        modal.closest('.replyguy-modal-overlay')?.remove();
      } else {
        throw new Error(response.error || 'Failed to generate reply');
      }
      
    } catch (error) {
      // Hide loading
      const generateText = modal.querySelector('#generate-text') as HTMLElement;
      const generateLoading = modal.querySelector('#generate-loading') as HTMLElement;
      const generateBtn = modal.querySelector('#modal-generate') as HTMLButtonElement;
      
      generateText.style.display = 'block';
      generateLoading.style.display = 'none';
      generateBtn.disabled = false;
      
      this.logger.error('Failed to generate reply', { error: (error as Error).message });
      alert('Failed to generate reply. Please check your API key in the extension settings.');
    }
  }

  /**
   * Insert generated reply into textbox
   */
  private insertReplyIntoTextbox(textbox: Element, content: string): void {
    if (textbox.tagName.toLowerCase() === 'textarea') {
      (textbox as HTMLTextAreaElement).value = content;
      textbox.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (textbox.hasAttribute('contenteditable')) {
      textbox.textContent = content;
      textbox.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Focus the textbox
    (textbox as HTMLElement).focus();
  }

  /**
   * Find all posts on the current Reddit page
   */
  private findPosts(): Element[] {
    const postSelectors = [
      '[data-testid="post-container"]', // New Reddit
      '.Post', // New Reddit alternative
      '.thing.link', // Old Reddit
      '[data-click-id="body"]', // New Reddit posts
      '.entry' // Old Reddit
    ];

    const posts: Element[] = [];
    postSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Avoid duplicates
        if (!posts.includes(el)) {
          posts.push(el);
        }
      });
    });

    return posts;
  }

  /**
   * Find all comments on the current Reddit page
   */
  private findComments(): Element[] {
    const commentSelectors = [
      '[data-testid="comment"]', // New Reddit
      '.Comment', // New Reddit alternative
      '.thing.comment', // Old Reddit
      '[data-type="comment"]' // Alternative
    ];

    const comments: Element[] = [];
    commentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Avoid duplicates
        if (!comments.includes(el)) {
          comments.push(el);
        }
      });
    });

    return comments;
  }

  /**
   * Add ReplyGuy.AI button to a post or comment
   */
  private addReplyButton(element: Element, type: 'post' | 'comment'): void {
    // Check if button already exists
    const existingButton = element.querySelector('.replyguy-ai-button');
    if (existingButton) {
      return;
    }

    // Find the action bar (where Share, Save buttons are)
    const actionBar = this.findActionBar(element);
    if (!actionBar) {
      return;
    }

    // Create the ReplyGuy.AI button
    const button = this.createReplyButton(element, type);
    
    // Insert button before the "..." menu or at the end
    const moreMenu = actionBar.querySelector('[aria-label="more options"]') || 
                     actionBar.querySelector('.icon-menu') ||
                     actionBar.querySelector('[data-testid="post-menu-trigger"]');
    
    if (moreMenu) {
      actionBar.insertBefore(button, moreMenu);
    } else {
      actionBar.appendChild(button);
    }
  }

  /**
   * Find the action bar within a post or comment
   */
  private findActionBar(element: Element): Element | null {
    const actionBarSelectors = [
      '[data-testid="post-engagement-bar"]', // New Reddit posts
      '[data-testid="comment-action-bar"]', // New Reddit comments
      '.flat-list.buttons', // Old Reddit
      '.entry .buttons', // Old Reddit
      '.Comment__toolbar', // New Reddit comment toolbar
      '.Post__toolbar' // New Reddit post toolbar
    ];

    for (const selector of actionBarSelectors) {
      const actionBar = element.querySelector(selector);
      if (actionBar) {
        return actionBar;
      }
    }

    return null;
  }

  /**
   * Create a ReplyGuy.AI button element
   */
  private createReplyButton(element: Element, type: 'post' | 'comment'): HTMLElement {
    const button = document.createElement('button');
    button.className = 'replyguy-ai-button';
    button.setAttribute('data-type', type);
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: none;
      border: none;
      color: #878A8C;
      font-size: 12px;
      font-weight: 700;
      line-height: 16px;
      cursor: pointer;
      border-radius: 2px;
      transition: background-color 0.1s ease;
      margin-right: 8px;
    `;

    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#F6F7F8';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    // Create icon (AI brain icon)
    const icon = document.createElement('span');
    icon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a6 6 0 0 0-6 6c0 1.5.5 2.9 1.3 4L2 13.5l1.5-1.3C4.9 13.5 6.4 14 8 14s3.1-.5 4.2-1.8L13.5 13.5l-1.3-1.5A6 6 0 0 0 8 2zm0 1a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5zm-2 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM8 9c-.5 0-1 .2-1.4.6-.4.4-.6.9-.6 1.4h4c0-.5-.2-1-.6-1.4C9 9.2 8.5 9 8 9z"/>
      </svg>
    `;
    icon.style.cssText = 'display: inline-flex; align-items: center;';

    // Create text
    const text = document.createElement('span');
    text.textContent = 'Use ReplyGuy.AI';

    button.appendChild(icon);
    button.appendChild(text);

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleReplyButtonClick(element, type);
    });

    return button;
  }

  /**
   * Handle click on ReplyGuy.AI button
   */
  private handleReplyButtonClick(element: Element, type: 'post' | 'comment'): void {
    try {
      // Extract content from the post or comment
      this.currentPost = this.extractor.extractCurrentContent();
      
      if (!this.currentPost) {
        this.logger.warn('Could not extract content from element');
        return;
      }

      // Show the ReplyGuy.AI popup
      this.showReplyPopup(element);
      
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Reply button click');
    }
  }

  /**
   * Show the ReplyGuy.AI popup for generating replies
   */
  private showReplyPopup(element: Element): void {
    // Remove any existing popup
    const existingPopup = document.querySelector('.replyguy-ai-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup container
    this.uiContainer = this.createUIContainer();
    this.uiContainer.classList.add('replyguy-ai-popup');
    document.body.appendChild(this.uiContainer);

    // Position popup near the clicked element
    const rect = element.getBoundingClientRect();
    this.uiContainer.style.position = 'fixed';
    this.uiContainer.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - 500)}px`;
    this.uiContainer.style.left = `${Math.min(rect.left, window.innerWidth - 400)}px`;
    this.uiContainer.style.zIndex = '10000';
    this.uiContainer.style.maxHeight = '80vh';
    this.uiContainer.style.overflow = 'auto';

    // Add close button functionality
    const closeButton = this.uiContainer.querySelector('.rai-close') as HTMLElement;
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.uiContainer?.remove();
        this.uiContainer = null;
      });
    }

    // Show step 1 (content preview)
    this.showStep(1);
    
    // Auto-detect content if current post is available
    if (this.currentPost) {
      this.showContentPreview(this.currentPost);
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
    container.id = 'replyguy-ai-container';
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

    this.buildUIStructure(container);
    this.attachEventListeners(container);

    return container;
  }

  /**
   * Build UI structure using safe DOM methods
   */
  private buildUIStructure(container: HTMLElement): void {
    // Create header
    const header = document.createElement('div');
    header.id = 'rai-header';
    header.style.cssText = `
      background: linear-gradient(135deg, #ff4500 0%, #ff6b35 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px 8px 0 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    // Header content
    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '20');
    icon.setAttribute('height', '20');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'currentColor');
    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z');
    icon.appendChild(iconPath);
    
    const title = document.createElement('span');
    title.style.fontWeight = '600';
    title.textContent = 'Reddit Reply AI';
    
    headerLeft.appendChild(icon);
    headerLeft.appendChild(title);

    const minimizeBtn = document.createElement('button');
    minimizeBtn.id = 'rai-minimize';
    minimizeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    `;
    minimizeBtn.textContent = '−';

    header.appendChild(headerLeft);
    header.appendChild(minimizeBtn);

    // Create content container
    const content = document.createElement('div');
    content.id = 'rai-content';
    content.style.padding = '20px';

    // Build all steps
    this.buildStep1(content);
    this.buildStep2(content);
    this.buildStep3(content);
    this.buildLoadingState(content);
    this.buildErrorState(content);

    container.appendChild(header);
    container.appendChild(content);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rai-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Build step 1 UI
   */
  private buildStep1(parent: HTMLElement): void {
    const step1 = document.createElement('div');
    step1.id = 'rai-step-1';
    step1.className = 'rai-step';

    const detectBtn = document.createElement('button');
    detectBtn.id = 'rai-detect-content';
    detectBtn.style.cssText = `
      background: #0079d3;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      width: 100%;
      margin-bottom: 16px;
    `;
    detectBtn.textContent = '📖 Analyze Current Reddit Content';

    const preview = document.createElement('div');
    preview.id = 'rai-content-preview';
    preview.style.display = 'none';

    const previewBox = document.createElement('div');
    previewBox.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    `;

    const previewTitle = document.createElement('h4');
    previewTitle.style.cssText = 'margin: 0 0 8px 0; color: #1a1a1b;';
    previewTitle.textContent = 'Detected Content:';

    const previewText = document.createElement('div');
    previewText.id = 'rai-content-text';
    previewText.style.cssText = 'font-size: 14px; color: #7c7c83;';

    const previewMeta = document.createElement('div');
    previewMeta.id = 'rai-content-meta';
    previewMeta.style.cssText = 'font-size: 12px; color: #878a8c; margin-top: 8px;';

    previewBox.appendChild(previewTitle);
    previewBox.appendChild(previewText);
    previewBox.appendChild(previewMeta);

    const proceedBtn = document.createElement('button');
    proceedBtn.id = 'rai-proceed';
    proceedBtn.style.cssText = `
      background: #46d160;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      width: 100%;
    `;
    proceedBtn.textContent = '✨ Generate AI Reply';

    preview.appendChild(previewBox);
    preview.appendChild(proceedBtn);

    step1.appendChild(detectBtn);
    step1.appendChild(preview);
    parent.appendChild(step1);
  }

  /**
   * Build step 2 UI
   */
  private buildStep2(parent: HTMLElement): void {
    const step2 = document.createElement('div');
    step2.id = 'rai-step-2';
    step2.className = 'rai-step';
    step2.style.display = 'none';

    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0 0 16px 0; color: #1a1a1b;';
    title.textContent = 'Customize Your Reply';

    // Direction field
    const directionGroup = document.createElement('div');
    directionGroup.style.marginBottom = '16px';

    const directionLabel = document.createElement('label');
    directionLabel.style.cssText = 'display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1b;';
    directionLabel.textContent = 'What direction should your reply take?';

    const directionTextarea = document.createElement('textarea');
    directionTextarea.id = 'rai-direction';
    directionTextarea.placeholder = 'e.g., Provide helpful advice, Share a different perspective, Ask follow-up questions...';
    directionTextarea.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
      box-sizing: border-box;
    `;

    directionGroup.appendChild(directionLabel);
    directionGroup.appendChild(directionTextarea);

    // Grid for length and mood
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;';

    // Length field
    const lengthGroup = document.createElement('div');
    const lengthLabel = document.createElement('label');
    lengthLabel.style.cssText = 'display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1b;';
    lengthLabel.textContent = 'Length';

    const lengthSelect = document.createElement('select');
    lengthSelect.id = 'rai-length';
    lengthSelect.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: white;
    `;

    const lengthOptions = [
      { value: 'small', text: 'Short (~25 words)' },
      { value: 'medium', text: 'Medium (~75 words)', selected: true },
      { value: 'large', text: 'Long (~150 words)' },
      { value: 'custom', text: 'Custom' }
    ];

    lengthOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.text;
      if (opt.selected) option.selected = true;
      lengthSelect.appendChild(option);
    });

    const customLengthInput = document.createElement('input');
    customLengthInput.id = 'rai-custom-length';
    customLengthInput.type = 'number';
    customLengthInput.min = '10';
    customLengthInput.max = '300';
    customLengthInput.value = '75';
    customLengthInput.placeholder = 'Word count';
    customLengthInput.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      margin-top: 8px;
      display: none;
    `;

    lengthGroup.appendChild(lengthLabel);
    lengthGroup.appendChild(lengthSelect);
    lengthGroup.appendChild(customLengthInput);

    // Mood field
    const moodGroup = document.createElement('div');
    const moodLabel = document.createElement('label');
    moodLabel.style.cssText = 'display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1b;';
    moodLabel.textContent = 'Mood';

    const moodSelect = document.createElement('select');
    moodSelect.id = 'rai-mood';
    moodSelect.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: white;
    `;

    const moodOptions = [
      { value: 'supportive', text: 'Supportive', selected: true },
      { value: 'witty', text: 'Witty' },
      { value: 'analytical', text: 'Analytical' },
      { value: 'casual', text: 'Casual' },
      { value: 'professional', text: 'Professional' },
      { value: 'custom', text: 'Custom' }
    ];

    moodOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.text;
      if (opt.selected) option.selected = true;
      moodSelect.appendChild(option);
    });

    const customMoodInput = document.createElement('input');
    customMoodInput.id = 'rai-custom-mood';
    customMoodInput.type = 'text';
    customMoodInput.placeholder = 'Describe the mood';
    customMoodInput.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      margin-top: 8px;
      display: none;
    `;

    moodGroup.appendChild(moodLabel);
    moodGroup.appendChild(moodSelect);
    moodGroup.appendChild(customMoodInput);

    grid.appendChild(lengthGroup);
    grid.appendChild(moodGroup);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 12px;';

    const backBtn = document.createElement('button');
    backBtn.id = 'rai-back';
    backBtn.style.cssText = `
      background: #878a8c;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      flex: 1;
    `;
    backBtn.textContent = '← Back';

    const generateBtn = document.createElement('button');
    generateBtn.id = 'rai-generate';
    generateBtn.style.cssText = `
      background: #ff4500;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      flex: 2;
    `;
    generateBtn.textContent = '🚀 Generate Reply';

    buttonContainer.appendChild(backBtn);
    buttonContainer.appendChild(generateBtn);

    step2.appendChild(title);
    step2.appendChild(directionGroup);
    step2.appendChild(grid);
    step2.appendChild(buttonContainer);
    parent.appendChild(step2);
  }

  /**
   * Build step 3 UI
   */
  private buildStep3(parent: HTMLElement): void {
    const step3 = document.createElement('div');
    step3.id = 'rai-step-3';
    step3.className = 'rai-step';
    step3.style.display = 'none';

    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0 0 16px 0; color: #1a1a1b;';
    title.textContent = 'Generated Reply';

    const replyContainer = document.createElement('div');
    replyContainer.id = 'rai-reply-container';
    replyContainer.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    `;

    const replyText = document.createElement('div');
    replyText.id = 'rai-reply-text';
    replyText.style.cssText = `
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1b;
      white-space: pre-wrap;
    `;

    const replyStats = document.createElement('div');
    replyStats.id = 'rai-reply-stats';
    replyStats.style.cssText = `
      font-size: 12px;
      color: #878a8c;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e9ecef;
    `;

    replyContainer.appendChild(replyText);
    replyContainer.appendChild(replyStats);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

    const buttons = [
      { id: 'rai-copy', text: '📋 Copy', bg: '#46d160' },
      { id: 'rai-regenerate', text: '🔄 Regenerate', bg: '#0079d3' },
      { id: 'rai-new', text: '✨ New Reply', bg: '#878a8c' }
    ];

    buttons.forEach(btnData => {
      const btn = document.createElement('button');
      btn.id = btnData.id;
      btn.style.cssText = `
        background: ${btnData.bg};
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        flex: 1;
        min-width: 120px;
      `;
      btn.textContent = btnData.text;
      buttonContainer.appendChild(btn);
    });

    step3.appendChild(title);
    step3.appendChild(replyContainer);
    step3.appendChild(buttonContainer);
    parent.appendChild(step3);
  }

  /**
   * Build loading state
   */
  private buildLoadingState(parent: HTMLElement): void {
    const loading = document.createElement('div');
    loading.id = 'rai-loading';
    loading.style.cssText = 'display: none; text-align: center; padding: 40px;';

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      display: inline-block;
      width: 32px;
      height: 32px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #ff4500;
      border-radius: 50%;
      animation: rai-spin 1s linear infinite;
    `;

    const loadingText = document.createElement('p');
    loadingText.style.cssText = 'margin: 16px 0 0 0; color: #878a8c;';
    loadingText.textContent = 'Generating your AI reply...';

    loading.appendChild(spinner);
    loading.appendChild(loadingText);
    parent.appendChild(loading);
  }

  /**
   * Build error state
   */
  private buildErrorState(parent: HTMLElement): void {
    const error = document.createElement('div');
    error.id = 'rai-error';
    error.style.display = 'none';

    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    `;

    const errorIcon = document.createElement('div');
    errorIcon.style.cssText = 'color: #e53e3e; font-size: 24px; text-align: center; margin-bottom: 8px;';
    errorIcon.textContent = '⚠️';

    const errorTitle = document.createElement('h4');
    errorTitle.style.cssText = 'margin: 0 0 8px 0; color: #c53030; text-align: center;';
    errorTitle.textContent = 'Generation Failed';

    const errorMessage = document.createElement('div');
    errorMessage.id = 'rai-error-message';
    errorMessage.style.cssText = 'color: #742a2a; text-align: center; font-size: 14px;';

    const retryBtn = document.createElement('button');
    retryBtn.id = 'rai-retry';
    retryBtn.style.cssText = `
      background: #e53e3e;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      width: 100%;
      margin-top: 12px;
    `;
    retryBtn.textContent = '🔄 Try Again';

    errorContainer.appendChild(errorIcon);
    errorContainer.appendChild(errorTitle);
    errorContainer.appendChild(errorMessage);
    errorContainer.appendChild(retryBtn);

    error.appendChild(errorContainer);
    parent.appendChild(error);
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
    // Watch for new posts and comments being added dynamically
    const observer = new MutationObserver((mutations) => {
      let shouldReinject = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check if this is a new post or comment
              if (element.matches('[data-testid="post-container"], [data-testid="comment"], .thing, .Post, .Comment')) {
                shouldReinject = true;
              }
              // Also check if any children are posts or comments
              if (element.querySelector('[data-testid="post-container"], [data-testid="comment"], .thing, .Post, .Comment')) {
                shouldReinject = true;
              }
            }
          });
        }
      });
      
      if (shouldReinject) {
        // Re-setup context menu detection after a small delay to ensure content is ready
        setTimeout(() => this.setupContextMenuDetection(), 500);
      }
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.logger.debug('DOM observers setup complete');
  }

  /**
   * Handle messages from background script
   */
  private handleMessage(request: any, sender: any, sendResponse: (response: any) => void): void {
    switch (request.type) {
      case 'SHOW_HELP_WRITE_MODAL':
        this.showHelpWriteModal();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  /**
   * Show Help Me Write style modal
   */
  private showHelpWriteModal(): void {
    try {
      const activeTextbox = (window as any).replyGuyActiveTextbox;
      if (!activeTextbox) {
        this.logger.warn('No active textbox found for Help Me Write modal');
        return;
      }

      // Extract conversation context
      const conversationContext = this.extractConversationContext(activeTextbox);
      
      if (!conversationContext) {
        this.logger.warn('Could not extract conversation context');
        return;
      }

      this.currentPost = conversationContext;
      this.showHelpWriteInterface(activeTextbox);
      
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Help Me Write modal');
    }
  }

  /**
   * Extract full conversation context from Reddit page
   */
  private extractConversationContext(textbox: Element): RedditPost | null {
    try {
      // Find the comment/post this textbox is replying to
      const commentContainer = textbox.closest('[data-testid^="comment"]') || 
                              textbox.closest('.Comment') ||
                              textbox.closest('[thing-id]');
      
      let contextPost: RedditPost;
      
      if (commentContainer) {
        // This is a reply to a comment - extract the comment chain
        contextPost = this.extractCommentChain(commentContainer);
      } else {
        // This is a reply to the main post
        contextPost = this.extractMainPost();
      }
      
      return contextPost;
      
    } catch (error) {
      this.logger.error('Failed to extract conversation context', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Extract comment chain leading to the reply
   */
  private extractCommentChain(commentElement: Element): RedditPost {
    const comments: string[] = [];
    let currentElement: Element | null = commentElement;
    
    // Walk up the comment tree to collect the conversation
    while (currentElement) {
      const commentText = this.extractCommentText(currentElement);
      if (commentText) {
        comments.unshift(commentText); // Add to beginning to maintain order
      }
      
      // Find parent comment
      const parentElement = currentElement.parentElement;
      if (parentElement) {
        currentElement = parentElement.closest('[data-testid^="comment"]') ||
                        parentElement.closest('.Comment') ||
                        parentElement.closest('[thing-id]');
      } else {
        currentElement = null;
      }
    }
    
    // Get the original post as well
    const mainPost = this.extractMainPost();
    
    return {
      id: mainPost.id,
      title: mainPost.title,
      content: mainPost.content + '\n\n--- Comment Thread ---\n' + comments.join('\n\n'),
      author: mainPost.author,
      subreddit: mainPost.subreddit,
      upvotes: mainPost.upvotes,
      comments: mainPost.comments,
      url: mainPost.url,
      timestamp: mainPost.timestamp,
      type: 'comment'
    };
  }

  /**
   * Extract main post content
   */
  private extractMainPost(): RedditPost {
    return this.extractor.extractCurrentContent() || {
      id: this.generateIdFromUrl(),
      title: this.extractPostTitle(),
      content: this.extractPostContent(),
      author: 'unknown',
      subreddit: this.extractSubreddit(),
      upvotes: 0,
      comments: 0,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      type: 'post'
    };
  }

  /**
   * Extract comment text from comment element
   */
  private extractCommentText(commentElement: Element): string {
    const textSelectors = [
      '[data-testid="comment"] > div > div > div',
      '.Comment__body',
      '.md',
      '.usertext-body'
    ];
    
    for (const selector of textSelectors) {
      const textElement = commentElement.querySelector(selector);
      if (textElement) {
        return this.cleanTextContent(textElement.textContent || '');
      }
    }
    
    return '';
  }

  /**
   * Show Help Me Write interface
   */
  private showHelpWriteInterface(textbox: Element): void {
    // Create modal overlay similar to Chrome's Help Me Write
    const overlay = document.createElement('div');
    overlay.className = 'replyguy-help-write-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create modal content
    const modal = this.createHelpWriteModal();
    overlay.appendChild(modal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Close on escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(overlay);
    
    // Store reference to textbox for later use
    (modal as any).targetTextbox = textbox;
  }

  /**
   * Create Help Me Write modal
   */
  private createHelpWriteModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'replyguy-help-write-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 480px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Help me write
        </h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Generate a contextual reply based on the conversation</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: #1f2937; font-weight: 500; font-size: 14px;">Length</label>
        <select id="help-write-length" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white;">
          <option value="small">Short (~25 words)</option>
          <option value="medium" selected>Medium (~75 words)</option>
          <option value="large">Long (~150 words)</option>
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: #1f2937; font-weight: 500; font-size: 14px;">Tone</label>
        <select id="help-write-tone" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white;">
          <option value="neutral" selected>Neutral</option>
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="enthusiastic">Enthusiastic</option>
          <option value="skeptical">Skeptical</option>
        </select>
      </div>
      
      <div style="margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 8px; color: #1f2937; font-weight: 500; font-size: 14px;">Approach</label>
        <select id="help-write-mood" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white;">
          <option value="supportive" selected>Supportive</option>
          <option value="curious">Curious</option>
          <option value="helpful">Helpful</option>
          <option value="thoughtful">Thoughtful</option>
          <option value="humorous">Humorous</option>
          <option value="serious">Serious</option>
        </select>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button id="help-write-cancel" style="flex: 1; padding: 10px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px;">Cancel</button>
        <button id="help-write-create" style="flex: 2; padding: 10px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span id="create-text">Create</span>
          <div id="create-loading" style="display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </button>
      </div>
    `;
    
    // Add event listeners
    const cancelBtn = modal.querySelector('#help-write-cancel') as HTMLElement;
    const createBtn = modal.querySelector('#help-write-create') as HTMLElement;
    
    cancelBtn.addEventListener('click', () => {
      modal.closest('.replyguy-help-write-overlay')?.remove();
    });
    
    createBtn.addEventListener('click', () => {
      this.generateHelpWriteReply(modal);
    });
    
    return modal;
  }

  /**
   * Generate reply from Help Me Write modal
   */
  private async generateHelpWriteReply(modal: HTMLElement): Promise<void> {
    try {
      const createText = modal.querySelector('#create-text') as HTMLElement;
      const createLoading = modal.querySelector('#create-loading') as HTMLElement;
      const createBtn = modal.querySelector('#help-write-create') as HTMLButtonElement;
      
      // Show loading
      createText.style.display = 'none';
      createLoading.style.display = 'block';
      createBtn.disabled = true;
      
      // Get customization options
      const lengthSelect = modal.querySelector('#help-write-length') as HTMLSelectElement;
      const toneSelect = modal.querySelector('#help-write-tone') as HTMLSelectElement;
      const moodSelect = modal.querySelector('#help-write-mood') as HTMLSelectElement;
      
      const customization: CustomizationOptions = {
        length: lengthSelect.value as any,
        tone: toneSelect.value as any,
        mood: moodSelect.value as any,
        direction: 'supportive'
      };
      
      // Generate reply via background script
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPLY',
        data: {
          post: this.currentPost,
          customization
        }
      });
      
      if (response.success) {
        this.insertReplyIntoTextbox((modal as any).targetTextbox, response.reply.content);
        modal.closest('.replyguy-help-write-overlay')?.remove();
      } else {
        throw new Error(response.error || 'Failed to generate reply');
      }
      
    } catch (error) {
      // Hide loading
      const createText = modal.querySelector('#create-text') as HTMLElement;
      const createLoading = modal.querySelector('#create-loading') as HTMLElement;
      const createBtn = modal.querySelector('#help-write-create') as HTMLButtonElement;
      
      createText.style.display = 'inline';
      createLoading.style.display = 'none';
      createBtn.disabled = false;
      
      this.logger.error('Failed to generate reply', { error: (error as Error).message });
      alert('Failed to generate reply. Please check your API key in the extension settings.');
    }
  }

  /**
   * Extract post title
   */
  private extractPostTitle(): string {
    const titleSelectors = [
      '[data-testid="post-content"] h1',
      '.Post__title',
      '.title a',
      'h1'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent) {
        return this.cleanTextContent(titleElement.textContent);
      }
    }
    
    return 'Reddit Post';
  }

  /**
   * Extract post content
   */
  private extractPostContent(): string {
    const contentSelectors = [
      '[data-testid="post-content"] [data-click-id="text"]',
      '.Post__body',
      '.usertext-body',
      '[data-testid="post-content"] > div > div'
    ];
    
    for (const selector of contentSelectors) {
      const contentElement = document.querySelector(selector);
      if (contentElement && contentElement.textContent) {
        return this.cleanTextContent(contentElement.textContent);
      }
    }
    
    return '';
  }

  /**
   * Extract subreddit name
   */
  private extractSubreddit(): string {
    const subredditMatch = window.location.pathname.match(/\/r\/([^\/]+)/);
    return subredditMatch ? subredditMatch[1] : 'unknown';
  }

  /**
   * Generate ID from URL
   */
  private generateIdFromUrl(): string {
    return window.location.pathname.split('/').pop() || 'unknown';
  }

  /**
   * Clean text content
   */
  private cleanTextContent(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}

// Initialize the content script
const redditReplyAI = new RedditReplyAI();
redditReplyAI.initialize();