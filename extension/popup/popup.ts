/**
 * Popup Script for ReplyGuy.AI Extension
 * Handles extension popup interface and settings management
 */

import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { StorageService } from '../services/storage-service';
import type { ExtensionSettings } from '../types/reddit';

class PopupManager {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private storageService: StorageService;

  constructor() {
    this.logger = new Logger('PopupManager');
    this.errorHandler = new ErrorHandler();
    this.storageService = new StorageService();
  }

  /**
   * Initialize popup interface
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing popup interface');
      
      await this.loadSettings();
      this.setupEventListeners();
      
      this.logger.info('Popup initialized successfully');
    } catch (error) {
      this.errorHandler.handle(error as Error, 'PopupManager.initialize');
    }
  }

  /**
   * Load current extension settings
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.storageService.getSettings();
      this.populateSettingsForm(settings);
    } catch (error) {
      this.errorHandler.handle(error as Error, 'PopupManager.loadSettings');
    }
  }

  /**
   * Populate settings form with current values
   */
  private populateSettingsForm(settings: ExtensionSettings): void {
    const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
    
    if (apiKeyInput && settings.openaiApiKey) {
      // Show censored version of API key for security
      const censoredKey = 'sk-...' + '•'.repeat(20) + settings.openaiApiKey.slice(-4);
      apiKeyInput.value = censoredKey;
    }
  }

  /**
   * Setup event listeners for popup interface
   */
  private setupEventListeners(): void {
    // Save settings button
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveSettings());
    }

    // Test API button
    const testApiButton = document.getElementById('test-api-key');
    if (testApiButton) {
      testApiButton.addEventListener('click', () => this.testApiConnection());
    }
  }

  /**
   * Save current settings
   */
  private async saveSettings(): Promise<void> {
    try {
      // Show loading animation
      this.showSaveLoading(true);
      
      const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
      
      const settings: Partial<ExtensionSettings> = {};

      // Only update API key if it's been changed and not empty
      if (apiKeyInput?.value && !apiKeyInput.value.includes('•')) {
        settings.openaiApiKey = apiKeyInput.value;
      }

      await this.storageService.updateSettings(settings);
      
      // Hide loading and show success
      this.showSaveLoading(false);
      this.showNotification('Settings saved successfully!', 'success');
      
    } catch (error) {
      this.showSaveLoading(false);
      this.errorHandler.handle(error as Error, 'PopupManager.saveSettings');
      this.showNotification('Failed to save settings', 'error');
    }
  }

  /**
   * Test API connection
   */
  private async testApiConnection(): Promise<void> {
    try {
      // Show loading animation
      this.showTestLoading(true);
      
      const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
      
      if (!apiKeyInput?.value) {
        this.showTestLoading(false);
        this.showNotification('Please enter an API key first', 'error');
        return;
      }

      // Test the API key with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKeyInput.value}`,
          'Content-Type': 'application/json'
        }
      });

      this.showTestLoading(false);

      if (response.ok) {
        this.showNotification('API key is valid and working!', 'success');
      } else {
        this.showNotification('API key is invalid or has no access', 'error');
      }
      
    } catch (error) {
      this.showTestLoading(false);
      this.errorHandler.handle(error as Error, 'PopupManager.testApiConnection');
      this.showNotification('Failed to test API connection', 'error');
    }
  }

  /**
   * Show/hide loading animation for test button
   */
  private showTestLoading(loading: boolean): void {
    const textElement = document.getElementById('test-api-text');
    const loadingElement = document.getElementById('test-api-loading');
    const button = document.getElementById('test-api-key') as HTMLButtonElement;

    if (textElement && loadingElement && button) {
      if (loading) {
        textElement.classList.add('hidden');
        loadingElement.classList.remove('hidden');
        button.disabled = true;
      } else {
        textElement.classList.remove('hidden');
        loadingElement.classList.add('hidden');
        button.disabled = false;
      }
    }
  }

  /**
   * Show/hide loading animation for save button
   */
  private showSaveLoading(loading: boolean): void {
    const textElement = document.getElementById('save-text');
    const loadingElement = document.getElementById('save-loading');
    const button = document.getElementById('save-settings') as HTMLButtonElement;

    if (textElement && loadingElement && button) {
      if (loading) {
        textElement.classList.add('hidden');
        loadingElement.classList.remove('hidden');
        button.disabled = true;
      } else {
        textElement.classList.remove('hidden');
        loadingElement.classList.add('hidden');
        button.disabled = false;
      }
    }
  }

  /**
   * Show notification in popup
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.className = `status ${type}`;
      statusMessage.classList.remove('hidden');
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        statusMessage.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const popupManager = new PopupManager();
  await popupManager.initialize();
});