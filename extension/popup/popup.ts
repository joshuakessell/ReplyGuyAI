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
      
      this.logger.info('Popup interface initialized successfully');
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
      this.logger.error('Failed to load settings', {}, error as Error);
    }
  }

  /**
   * Populate settings form with current values
   */
  private populateSettingsForm(settings: ExtensionSettings): void {
    // Update form fields with current settings
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const saveHistoryCheckbox = document.getElementById('saveHistory') as HTMLInputElement;
    const darkModeCheckbox = document.getElementById('darkMode') as HTMLInputElement;
    
    if (apiKeyInput) {
      apiKeyInput.value = settings.openaiApiKey ? '••••••••' : '';
    }
    
    if (saveHistoryCheckbox) {
      saveHistoryCheckbox.checked = settings.saveHistory;
    }
    
    if (darkModeCheckbox) {
      darkModeCheckbox.checked = settings.darkMode;
    }
  }

  /**
   * Setup event listeners for popup interface
   */
  private setupEventListeners(): void {
    // Save settings button
    const saveButton = document.getElementById('saveSettings');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveSettings());
    }

    // Clear history button
    const clearHistoryButton = document.getElementById('clearHistory');
    if (clearHistoryButton) {
      clearHistoryButton.addEventListener('click', () => this.clearHistory());
    }

    // Test API button
    const testApiButton = document.getElementById('testApi');
    if (testApiButton) {
      testApiButton.addEventListener('click', () => this.testApiConnection());
    }
  }

  /**
   * Save current settings
   */
  private async saveSettings(): Promise<void> {
    try {
      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
      const saveHistoryCheckbox = document.getElementById('saveHistory') as HTMLInputElement;
      const darkModeCheckbox = document.getElementById('darkMode') as HTMLInputElement;
      
      const settings: Partial<ExtensionSettings> = {
        saveHistory: saveHistoryCheckbox?.checked || false,
        darkMode: darkModeCheckbox?.checked || false
      };

      // Only update API key if it's been changed
      if (apiKeyInput?.value && !apiKeyInput.value.includes('•')) {
        settings.openaiApiKey = apiKeyInput.value;
      }

      await this.storageService.updateSettings(settings);
      this.showNotification('Settings saved successfully!', 'success');
      
    } catch (error) {
      this.errorHandler.handle(error as Error, 'PopupManager.saveSettings');
      this.showNotification('Failed to save settings', 'error');
    }
  }

  /**
   * Clear reply history
   */
  private async clearHistory(): Promise<void> {
    try {
      await this.storageService.clearHistory();
      this.showNotification('History cleared successfully!', 'success');
    } catch (error) {
      this.errorHandler.handle(error as Error, 'PopupManager.clearHistory');
      this.showNotification('Failed to clear history', 'error');
    }
  }

  /**
   * Test API connection
   */
  private async testApiConnection(): Promise<void> {
    try {
      this.showNotification('Testing API connection...', 'info');
      
      // Send message to background script to test API
      const response = await chrome.runtime.sendMessage({
        action: 'testApi'
      });

      if (response.success) {
        this.showNotification('API connection successful!', 'success');
      } else {
        this.showNotification('API connection failed', 'error');
      }
    } catch (error) {
      this.errorHandler.handle(error as Error, 'PopupManager.testApiConnection');
      this.showNotification('Failed to test API connection', 'error');
    }
  }

  /**
   * Show notification in popup
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.textContent = message;
      notification.className = `notification ${type}`;
      notification.style.display = 'block';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const popupManager = new PopupManager();
  await popupManager.initialize();
});