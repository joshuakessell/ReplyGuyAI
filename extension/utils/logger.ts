/**
 * Enterprise-grade logging utility for ReplyGuy.AI Extension
 * Provides structured logging with configurable levels and storage
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

export class Logger {
  private component: string;
  private logLevel: LogLevel;
  private maxLogEntries: number = 1000;

  constructor(component: string, logLevel: LogLevel = LogLevel.INFO) {
    this.component = component;
    this.logLevel = logLevel;
  }

  /**
   * Log error message with optional context and error object
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log warning message with optional context
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info message with optional context
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug message with optional context
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level > this.logLevel) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      context,
      error
    };

    // Console output with appropriate method
    this.outputToConsole(logEntry);

    // Store in extension storage for debugging
    this.storeLogEntry(logEntry);
  }

  /**
   * Output log entry to console with appropriate formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${LogLevel[entry.level]}] [${entry.component}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.context, entry.error);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(message, entry.context);
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.context);
        break;
    }
  }

  /**
   * Store log entry in extension storage for debugging
   */
  private async storeLogEntry(entry: LogEntry): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['debugLogs']);
        const logs: LogEntry[] = result.debugLogs || [];
        
        logs.push(entry);
        
        // Maintain log size limit
        if (logs.length > this.maxLogEntries) {
          logs.splice(0, logs.length - this.maxLogEntries);
        }
        
        await chrome.storage.local.set({ debugLogs: logs });
      }
    } catch (error) {
      // Silently fail to avoid logging loops
      console.warn('Failed to store log entry:', error);
    }
  }

  /**
   * Retrieve stored log entries for debugging
   */
  static async getLogs(): Promise<LogEntry[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['debugLogs']);
        return result.debugLogs || [];
      }
    } catch (error) {
      console.error('Failed to retrieve logs:', error);
    }
    return [];
  }

  /**
   * Clear stored log entries
   */
  static async clearLogs(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['debugLogs']);
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Export logs as downloadable file
   */
  static async exportLogs(): Promise<string> {
    const logs = await Logger.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}