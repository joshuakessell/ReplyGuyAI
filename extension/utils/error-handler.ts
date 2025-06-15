/**
 * Centralized error handling system for Reddit Reply AI Extension
 * Provides comprehensive error tracking, reporting, and recovery mechanisms
 */

import { Logger } from './logger';
import type { ErrorDetails } from '../types/reddit';

export enum ErrorCode {
  // API Related
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  
  // Content Extraction
  REDDIT_CONTENT_NOT_FOUND = 'REDDIT_CONTENT_NOT_FOUND',
  INVALID_REDDIT_PAGE = 'INVALID_REDDIT_PAGE',
  CONTENT_EXTRACTION_FAILED = 'CONTENT_EXTRACTION_FAILED',
  
  // Extension Infrastructure
  STORAGE_ERROR = 'STORAGE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  EXTENSION_CONTEXT_INVALID = 'EXTENSION_CONTEXT_INVALID',
  
  // User Input
  INVALID_CUSTOMIZATION = 'INVALID_CUSTOMIZATION',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  
  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  lastError?: ErrorDetails;
  lastResetTimestamp: string;
}

export class ErrorHandler {
  private logger: Logger;
  private maxStoredErrors: number = 100;

  constructor() {
    this.logger = new Logger('ErrorHandler');
  }

  /**
   * Handle an error with comprehensive logging and user feedback
   */
  handle(error: Error, context: string, additionalContext?: Record<string, any>): ErrorDetails {
    const errorCode = this.categorizeError(error);
    const errorDetails: ErrorDetails = {
      code: errorCode,
      message: this.sanitizeErrorMessage(error.message, errorCode),
      timestamp: new Date().toISOString(),
      context: {
        operation: context,
        stack: error.stack,
        ...additionalContext
      }
    };

    // Log the error
    this.logger.error(`Error in ${context}`, errorDetails.context, error);

    // Store error for metrics and debugging
    this.storeError(errorDetails);

    // Update error metrics
    this.updateErrorMetrics(errorDetails);

    return errorDetails;
  }

  /**
   * Categorize error into appropriate error code
   */
  private categorizeError(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    // API Key related
    if (message.includes('api key') && message.includes('missing')) {
      return ErrorCode.API_KEY_MISSING;
    }
    if (message.includes('api key') && (message.includes('invalid') || message.includes('unauthorized'))) {
      return ErrorCode.API_KEY_INVALID;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCode.API_RATE_LIMITED;
    }

    // Content extraction
    if (message.includes('reddit') && message.includes('not found')) {
      return ErrorCode.REDDIT_CONTENT_NOT_FOUND;
    }
    if (message.includes('invalid reddit page') || message.includes('not a reddit')) {
      return ErrorCode.INVALID_REDDIT_PAGE;
    }
    if (message.includes('content extraction') || message.includes('failed to extract')) {
      return ErrorCode.CONTENT_EXTRACTION_FAILED;
    }

    // Storage related
    if (message.includes('storage') || message.includes('quota')) {
      return ErrorCode.STORAGE_ERROR;
    }

    // Network related
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCode.NETWORK_ERROR;
    }
    if (message.includes('timeout')) {
      return ErrorCode.TIMEOUT_ERROR;
    }

    // Permissions
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorCode.PERMISSION_DENIED;
    }

    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Provide user-friendly error messages
   */
  private sanitizeErrorMessage(originalMessage: string, errorCode: ErrorCode): string {
    switch (errorCode) {
      case ErrorCode.API_KEY_MISSING:
        return 'OpenAI API key is required. Please configure it in extension settings.';
      
      case ErrorCode.API_KEY_INVALID:
        return 'Invalid OpenAI API key. Please check your key in extension settings.';
      
      case ErrorCode.API_RATE_LIMITED:
        return 'API rate limit exceeded. Please wait a moment before trying again.';
      
      case ErrorCode.REDDIT_CONTENT_NOT_FOUND:
        return 'Unable to find Reddit content on this page. Please make sure you\'re on a Reddit post or comment.';
      
      case ErrorCode.INVALID_REDDIT_PAGE:
        return 'This doesn\'t appear to be a valid Reddit page. Please navigate to a Reddit post or comment.';
      
      case ErrorCode.CONTENT_EXTRACTION_FAILED:
        return 'Failed to extract content from this Reddit page. The page structure may have changed.';
      
      case ErrorCode.STORAGE_ERROR:
        return 'Unable to save data. Please check your browser storage permissions.';
      
      case ErrorCode.PERMISSION_DENIED:
        return 'Permission denied. Please ensure the extension has necessary permissions for Reddit.';
      
      case ErrorCode.NETWORK_ERROR:
        return 'Network error occurred. Please check your internet connection and try again.';
      
      case ErrorCode.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.';
      
      case ErrorCode.CONTENT_TOO_LONG:
        return 'Content is too long to process. Please try with shorter content.';
      
      default:
        return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
    }
  }

  /**
   * Store error details for debugging and analysis
   */
  private async storeError(errorDetails: ErrorDetails): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['errorHistory']);
        const errors: ErrorDetails[] = result.errorHistory || [];
        
        errors.push(errorDetails);
        
        // Maintain error history size limit
        if (errors.length > this.maxStoredErrors) {
          errors.splice(0, errors.length - this.maxStoredErrors);
        }
        
        await chrome.storage.local.set({ errorHistory: errors });
      }
    } catch (error) {
      this.logger.warn('Failed to store error details', { originalError: errorDetails });
    }
  }

  /**
   * Update error metrics for monitoring
   */
  private async updateErrorMetrics(errorDetails: ErrorDetails): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['errorMetrics']);
        const metrics: ErrorMetrics = result.errorMetrics || {
          totalErrors: 0,
          errorsByCode: {},
          lastResetTimestamp: new Date().toISOString()
        };
        
        metrics.totalErrors++;
        metrics.errorsByCode[errorDetails.code] = (metrics.errorsByCode[errorDetails.code] || 0) + 1;
        metrics.lastError = errorDetails;
        
        await chrome.storage.local.set({ errorMetrics: metrics });
      }
    } catch (error) {
      this.logger.warn('Failed to update error metrics');
    }
  }

  /**
   * Get error statistics for debugging and monitoring
   */
  static async getErrorMetrics(): Promise<ErrorMetrics | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['errorMetrics']);
        return result.errorMetrics || null;
      }
    } catch (error) {
      console.error('Failed to retrieve error metrics:', error);
    }
    return null;
  }

  /**
   * Get recent error history
   */
  static async getErrorHistory(): Promise<ErrorDetails[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['errorHistory']);
        return result.errorHistory || [];
      }
    } catch (error) {
      console.error('Failed to retrieve error history:', error);
    }
    return [];
  }

  /**
   * Clear error history and metrics
   */
  static async clearErrorData(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['errorHistory', 'errorMetrics']);
      }
    } catch (error) {
      console.error('Failed to clear error data:', error);
    }
  }

  /**
   * Create user-friendly error notification
   */
  showUserNotification(errorDetails: ErrorDetails, actionable: boolean = true): void {
    const notificationOptions = {
      type: 'basic' as const,
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'Reddit Reply AI Error',
      message: errorDetails.message,
      contextMessage: actionable ? 'Click to open settings' : undefined
    };

    try {
      chrome.notifications.create(errorDetails.code, notificationOptions);
      
      if (actionable) {
        chrome.notifications.onClicked.addListener((notificationId) => {
          if (notificationId === errorDetails.code) {
            chrome.runtime.openOptionsPage();
          }
        });
      }
    } catch (error) {
      this.logger.warn('Failed to show user notification', { error: error.message });
    }
  }
}