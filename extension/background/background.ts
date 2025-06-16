/**
 * Background Service Worker for ReplyGuy.AI Extension
 * Handles AI API communication and extension lifecycle events
 */

import { AIService } from '../services/ai-service';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { StorageService } from '../services/storage-service';
import type { RedditPost, GenerateReplyRequest, AiReply } from '../types/reddit';

class BackgroundService {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private aiService: AIService;
  private storageService: StorageService;

  constructor() {
    this.logger = new Logger('BackgroundService');
    this.errorHandler = new ErrorHandler();
    this.aiService = new AIService();
    this.storageService = new StorageService();
  }

  /**
   * Initialize background service
   */
  async initialize(): Promise<void> {
    this.logger.info('Background service initializing');

    // Set up event listeners
    this.setupInstallationHandler();
    this.setupContextMenus();
    this.setupMessageHandler();
    this.setupErrorHandlers();

    this.logger.info('Background service initialized');
  }

  /**
   * Handle extension installation and updates
   */
  private setupInstallationHandler(): void {
    chrome.runtime.onInstalled.addListener(async (details) => {
      try {
        this.logger.info('Extension event', { reason: details.reason });
        
        if (details.reason === 'install') {
          await this.storageService.initialize();
          this.logger.info('Extension storage initialized on first install');
          
          // Open welcome onboarding page on first install
          try {
            const onboardingUrl = chrome.runtime.getURL('onboarding.html');
            this.logger.info('Attempting to open onboarding URL:', onboardingUrl);
            
            await chrome.tabs.create({
              url: onboardingUrl
            });
            
            this.logger.info('Onboarding tab created successfully');
          } catch (error) {
            this.logger.error('Failed to open onboarding page:', error);
            
            // Fallback: try opening popup instead
            try {
              const popupUrl = chrome.runtime.getURL('popup.html');
              await chrome.tabs.create({
                url: popupUrl
              });
              this.logger.info('Opened popup as fallback');
            } catch (popupError) {
              this.logger.error('Failed to open popup fallback:', popupError);
            }
          }
        }
        
        if (details.reason === 'update') {
          // Handle extension updates
          await this.handleExtensionUpdate(details.previousVersion);
        }
        
      } catch (error) {
        this.errorHandler.handle(error as Error, 'Extension installation');
      }
    });
  }

  /**
   * Set up context menu for Reddit pages
   */
  private setupContextMenus(): void {
    chrome.runtime.onInstalled.addListener(async () => {
      try {
        await chrome.contextMenus.create({
          id: 'replyguy-ai-generate',
          title: 'Generate AI Reply',
          contexts: ['selection', 'page'],
          documentUrlPatterns: ['*://*.reddit.com/*']
        });

        await chrome.contextMenus.create({
          id: 'replyguy-ai-settings',
          title: 'ReplyGuy.AI Settings',
          contexts: ['action']
        });

        this.logger.info('Context menus created');
      } catch (error) {
        this.errorHandler.handle(error as Error, 'Context menu setup');
      }
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        if (info.menuItemId === 'replyguy-ai-generate' && tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_REPLY_GENERATOR',
            selectedText: info.selectionText
          });
        }
        
        if (info.menuItemId === 'replyguy-ai-settings') {
          // Open extension popup instead of non-existent options page
          chrome.action.openPopup();
        }
      } catch (error) {
        this.errorHandler.handle(error as Error, 'Context menu action');
      }
    });
  }

  /**
   * Set up message handler for communication with content scripts and popup
   */
  private setupMessageHandler(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Indicates async response
    });
  }

  /**
   * Handle messages from content scripts and popup
   */
  private async handleMessage(request: any, sender: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      const startTime = Date.now();
      this.logger.debug('Message received', { type: request.type, sender: sender.tab?.url });

      switch (request.type) {
        case 'GENERATE_REPLY':
          const reply = await this.handleGenerateReply(request.data);
          sendResponse({ success: true, data: reply });
          break;
          
        case 'GET_STORED_SETTINGS':
          const settings = await this.storageService.getSettings();
          sendResponse({ success: true, data: settings });
          break;
          
        case 'UPDATE_SETTINGS':
          await this.storageService.updateSettings(request.data);
          sendResponse({ success: true });
          break;
          
        case 'GET_REPLY_HISTORY':
          const history = await this.storageService.getReplyHistory(request.data?.limit);
          sendResponse({ success: true, data: history });
          break;
          
        case 'CLEAR_HISTORY':
          await this.storageService.clearHistory();
          sendResponse({ success: true });
          break;
          
        case 'EXPORT_DATA':
          const exportData = await this.storageService.exportData();
          sendResponse({ success: true, data: exportData });
          break;
          
        case 'IMPORT_DATA':
          await this.storageService.importData(request.data);
          sendResponse({ success: true });
          break;
          
        case 'HEALTH_CHECK':
          const health = await this.performHealthCheck();
          sendResponse({ success: true, data: health });
          break;

        case 'TEST_API_KEY':
          const isValid = await this.aiService.testApiKey(request.data.apiKey);
          sendResponse({ success: true, data: { valid: isValid } });
          break;
          
        case 'GET_STORAGE_STATS':
          const stats = await this.storageService.getStorageStats();
          sendResponse({ success: true, data: stats });
          break;
          
        default:
          this.logger.warn('Unknown message type', { type: request.type });
          sendResponse({ success: false, error: 'Unknown message type' });
      }

      const duration = Date.now() - startTime;
      this.logger.debug('Message handled', { type: request.type, duration });

    } catch (error) {
      const errorDetails = this.errorHandler.handle(error as Error, `Message handling: ${request.type}`);
      sendResponse({ success: false, error: errorDetails.message });
    }
  }

  /**
   * Generate AI reply for Reddit content
   */
  private async handleGenerateReply(data: GenerateReplyRequest): Promise<AiReply> {
    this.logger.info('Generating AI reply', { postId: data.post.id });
    
    try {
      // Validate request
      if (!data.post || !data.customization) {
        throw new Error('Invalid request: missing post or customization data');
      }

      // Get settings and validate API key
      const settings = await this.storageService.getSettings();
      if (!settings.openaiApiKey) {
        throw new Error('OpenAI API key not configured. Please set it in extension settings.');
      }

      // Validate API key format
      if (!AIService.validateApiKey(settings.openaiApiKey)) {
        throw new Error('Invalid OpenAI API key format. Please check your key in settings.');
      }

      // Generate reply using AI service
      const reply = await this.aiService.generateReply(data.post, data.customization, settings.openaiApiKey);
      
      // Store in history if enabled
      if (settings.saveHistory) {
        await this.storageService.addToHistory({
          id: crypto.randomUUID(),
          postId: data.post.id,
          postTitle: data.post.title,
          reply: reply.content,
          customization: data.customization,
          timestamp: new Date().toISOString(),
          wordCount: reply.wordCount,
          subreddit: data.post.subreddit
        });
      }
      
      this.logger.info('Reply generated successfully', { 
        wordCount: reply.wordCount,
        postId: data.post.id 
      });
      
      return reply;
      
    } catch (error) {
      this.errorHandler.handle(error as Error, 'AI reply generation');
      throw error;
    }
  }

  /**
   * Perform comprehensive system health check
   */
  private async performHealthCheck() {
    try {
      const settings = await this.storageService.getSettings();
      const storageHealthy = await this.storageService.healthCheck();
      
      // Test API key if available
      let apiKeyStatus = 'not_configured';
      if (settings.openaiApiKey) {
        if (AIService.validateApiKey(settings.openaiApiKey)) {
          const isValid = await this.aiService.testApiKey(settings.openaiApiKey);
          apiKeyStatus = isValid ? 'valid' : 'invalid';
        } else {
          apiKeyStatus = 'invalid_format';
        }
      }

      return {
        timestamp: new Date().toISOString(),
        extensionVersion: chrome.runtime.getManifest().version,
        apiKeyStatus,
        storageHealthy,
        settingsConfigured: {
          apiKey: !!settings.openaiApiKey,
          defaultCustomization: !!settings.defaultCustomization,
          historyEnabled: settings.saveHistory
        }
      };
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Health check');
      throw error;
    }
  }

  /**
   * Handle extension updates
   */
  private async handleExtensionUpdate(previousVersion?: string): Promise<void> {
    try {
      this.logger.info('Handling extension update', { previousVersion });
      
      // Migration logic for different versions
      if (previousVersion) {
        // Add migration logic here if needed for future versions
        // Example: migrate settings format, update storage schema, etc.
      }

      // Update storage if needed
      await this.storageService.initialize();
      
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Extension update');
    }
  }

  /**
   * Set up global error handlers
   */
  private setupErrorHandlers(): void {
    // Handle startup errors
    chrome.runtime.onStartup.addListener(() => {
      this.logger.info('Extension startup');
    });

    // Handle global errors
    self.addEventListener('error', (event) => {
      this.errorHandler.handle(new Error(event.message), 'Global error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    self.addEventListener('unhandledrejection', (event) => {
      this.errorHandler.handle(new Error(event.reason), 'Unhandled promise rejection');
    });
  }
}

// Initialize background service
const backgroundService = new BackgroundService();
backgroundService.initialize().catch(error => {
  console.error('Failed to initialize background service:', error);
});