// Utility functions for Hotmail Checker

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Account,
  ProxyConfig,
  FileUploadResult,
  EMAIL_REGEX,
  COMBO_REGEX,
  PROXY_REGEX,
} from './types';

/**
 * Merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse combo list (email:password format)
 */
export function parseComboList(text: string): FileUploadResult {
  try {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const accounts: Account[] = [];
    let validLines = 0;
    let invalidLines = 0;

    lines.forEach((line) => {
      if (!COMBO_REGEX.test(line)) {
        invalidLines++;
        return;
      }

      const [email, password] = line.split(':');
      
      if (email && password && EMAIL_REGEX.test(email)) {
        accounts.push({
          email: email.trim(),
          password: password.trim(),
          id: generateId(),
        });
        validLines++;
      } else {
        invalidLines++;
      }
    });

    return {
      success: accounts.length > 0,
      accounts,
      totalLines: lines.length,
      validLines,
      invalidLines,
      error: accounts.length === 0 ? 'No valid accounts found' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse combo list',
      totalLines: 0,
      validLines: 0,
      invalidLines: 0,
    };
  }
}

/**
 * Parse proxy list (host:port:user:pass or host:port format)
 */
export function parseProxyList(text: string): ProxyConfig[] {
  try {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const proxies: ProxyConfig[] = [];

    lines.forEach((line) => {
      if (!PROXY_REGEX.test(line)) {
        return;
      }

      const parts = line.split(':');
      
      if (parts.length >= 2) {
        const [host, port, username, password] = parts;
        
        proxies.push({
          host: host.trim(),
          port: parseInt(port.trim(), 10),
          username: username?.trim(),
          password: password?.trim(),
          protocol: 'http',
          isActive: true,
          failCount: 0,
        });
      }
    });

    return proxies;
  } catch (error) {
    console.error('Failed to parse proxy list:', error);
    return [];
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate estimated time remaining
 */
export function calculateETA(
  total: number,
  completed: number,
  startTime: Date
): number {
  if (completed === 0) return 0;
  
  const elapsed = Date.now() - startTime.getTime();
  const rate = completed / elapsed;
  const remaining = total - completed;
  
  return Math.ceil(remaining / rate / 1000); // Return in seconds
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate proxy configuration
 */
export function isValidProxy(proxy: ProxyConfig): boolean {
  return (
    proxy.host.length > 0 &&
    proxy.port > 0 &&
    proxy.port <= 65535
  );
}

/**
 * Sanitize email for display (hide part of email)
 */
export function sanitizeEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  const visibleChars = Math.min(3, username.length);
  const hidden = '*'.repeat(username.length - visibleChars);
  
  return `${username.slice(0, visibleChars)}${hidden}@${domain}`;
}

/**
 * Delay execution (for rate limiting)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * Retry async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i < maxRetries - 1) {
        const delayMs = initialDelay * Math.pow(2, i);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Download data as file
 */
export function downloadFile(content: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Export results to JSON
 */
export function exportToJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Export results to CSV
 */
export function exportToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      const stringValue = value?.toString() ?? '';
      // Escape quotes and wrap in quotes if contains comma
      return stringValue.includes(',')
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * Get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check if code is running on client side
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get random item from array
 */
export function getRandomItem<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}
