/**
 * Storage Service for Reddit Reply AI Extension
 * Manages extension settings, reply history, and user preferences
 */

import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import type { ExtensionSettings, ReplyHistory, CustomizationOptions } from '../types/reddit';

export class StorageService {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private storageKeys = {
    settings: 'redditReplyAI_settings',
    history: 'redditReplyAI_history',
    preferences: 'redditReplyAI_preferences'
  };

  constructor() {
    this.logger = new Logger('StorageService');
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Initialize storage with default values
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing storage service');

      const defaultSettings: ExtensionSettings = {
        openaiApiKey: '',
        defaultCustomization: {
          length: 'medium',
          mood: 'supportive',
          tone: 'neutral'
        },
        autoDetectContext: true,
        saveHistory: true,
        darkMode: false
      };

      const existingSettings = await this.getSettings();
      if (!existingSettings.openaiApiKey && !existingSettings.defaultCustomization) {
        await this.updateSettings(defaultSettings);
        this.logger.info('Default settings initialized');
      }

    } catch (error) {
      this.errorHandler.handle(error as Error, 'Storage initialization');
      throw error;
    }
  }

  /**
   * Get extension settings
   */
  async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.sync.get([this.storageKeys.settings]);
      return result[this.storageKeys.settings] || {};
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Get settings');
      throw error;
    }
  }

  /**
   * Update extension settings
   */
  async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await chrome.storage.sync.set({
        [this.storageKeys.settings]: updatedSettings
      });

      this.logger.info('Settings updated successfully');
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Update settings');
      throw error;
    }
  }

  /**
   * Get reply history
   */
  async getReplyHistory(limit?: number): Promise<ReplyHistory[]> {
    try {
      const result = await chrome.storage.local.get([this.storageKeys.history]);
      let history: ReplyHistory[] = result[this.storageKeys.history] || [];
      
      // Sort by timestamp (newest first)
      history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (limit) {
        history = history.slice(0, limit);
      }

      return history;
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Get reply history');
      throw error;
    }
  }

  /**
   * Add reply to history
   */
  async addToHistory(reply: ReplyHistory): Promise<void> {
    try {
      const settings = await this.getSettings();
      
      if (!settings.saveHistory) {
        this.logger.debug('History saving disabled, skipping');
        return;
      }

      const history = await this.getReplyHistory();
      history.unshift(reply);

      // Maintain history size limit (500 entries)
      const maxHistorySize = 500;
      if (history.length > maxHistorySize) {
        history.splice(maxHistorySize);
      }

      await chrome.storage.local.set({
        [this.storageKeys.history]: history
      });

      this.logger.info('Reply added to history', { replyId: reply.id });
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Add to history');
      throw error;
    }
  }

  /**
   * Remove reply from history
   */
  async removeFromHistory(replyId: string): Promise<void> {
    try {
      const history = await this.getReplyHistory();
      const filteredHistory = history.filter(item => item.id !== replyId);

      await chrome.storage.local.set({
        [this.storageKeys.history]: filteredHistory
      });

      this.logger.info('Reply removed from history', { replyId });
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Remove from history');
      throw error;
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.storageKeys.history]: []
      });

      this.logger.info('History cleared');
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Clear history');
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    bytesUsed: number;
    quotaBytes: number;
    historyCount: number;
    usagePercentage: number;
  }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quotaBytes = chrome.storage.local.QUOTA_BYTES;
      const history = await this.getReplyHistory();

      return {
        bytesUsed: bytesInUse,
        quotaBytes,
        historyCount: history.length,
        usagePercentage: Math.round((bytesInUse / quotaBytes) * 100)
      };
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Get storage stats');
      throw error;
    }
  }

  /**
   * Export user data for backup
   */
  async exportData(): Promise<{
    settings: ExtensionSettings;
    history: ReplyHistory[];
    exportTimestamp: string;
    version: string;
  }> {
    try {
      const settings = await this.getSettings();
      const history = await this.getReplyHistory();

      return {
        settings: {
          ...settings,
          openaiApiKey: '[REDACTED]' // Don't export API key
        },
        history,
        exportTimestamp: new Date().toISOString(),
        version: '2.0.0'
      };
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Export data');
      throw error;
    }
  }

  /**
   * Import user data from backup
   */
  async importData(data: {
    settings?: Partial<ExtensionSettings>;
    history?: ReplyHistory[];
  }): Promise<void> {
    try {
      if (data.settings) {
        // Don't import API key from backup for security
        const { openaiApiKey, ...settingsToImport } = data.settings;
        await this.updateSettings(settingsToImport);
      }

      if (data.history) {
        // Merge with existing history, avoiding duplicates
        const existingHistory = await this.getReplyHistory();
        const existingIds = new Set(existingHistory.map(item => item.id));
        
        const newHistory = data.history.filter(item => !existingIds.has(item.id));
        const mergedHistory = [...existingHistory, ...newHistory];

        await chrome.storage.local.set({
          [this.storageKeys.history]: mergedHistory
        });
      }

      this.logger.info('Data imported successfully');
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Import data');
      throw error;
    }
  }

  /**
   * Perform storage health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test write and read
      const testKey = 'healthCheck_' + Date.now();
      const testValue = { timestamp: new Date().toISOString() };

      await chrome.storage.local.set({ [testKey]: testValue });
      const result = await chrome.storage.local.get([testKey]);
      await chrome.storage.local.remove([testKey]);

      const success = result[testKey]?.timestamp === testValue.timestamp;
      this.logger.debug('Storage health check', { success });
      
      return success;
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Storage health check');
      return false;
    }
  }

  /**
   * Get default customization options
   */
  async getDefaultCustomization(): Promise<CustomizationOptions> {
    try {
      const settings = await this.getSettings();
      return {
        direction: '',
        length: settings.defaultCustomization?.length || 'medium',
        mood: settings.defaultCustomization?.mood || 'supportive',
        tone: settings.defaultCustomization?.tone || 'neutral'
      };
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Get default customization');
      return {
        direction: '',
        length: 'medium',
        mood: 'supportive',
        tone: 'neutral'
      };
    }
  }

  /**
   * Update default customization options
   */
  async updateDefaultCustomization(customization: Partial<CustomizationOptions>): Promise<void> {
    try {
      const settings = await this.getSettings();
      const updatedSettings = {
        ...settings,
        defaultCustomization: {
          ...settings.defaultCustomization,
          ...customization
        }
      };

      await this.updateSettings(updatedSettings);
      this.logger.info('Default customization updated');
    } catch (error) {
      this.errorHandler.handle(error as Error, 'Update default customization');
      throw error;
    }
  }
}