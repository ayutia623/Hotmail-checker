// Core Types for Hotmail Inbox Checker

/**
 * Account credentials format
 */
export interface Account {
  email: string;
  password: string;
  id?: string; // Unique identifier for tracking
}

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  isActive?: boolean;
  lastUsed?: Date;
  failCount?: number;
}

/**
 * Email message structure from inbox
 */
export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  date: Date;
  body: string;
  snippet?: string;
  hasAttachments?: boolean;
  isRead?: boolean;
  folder?: string;
}

/**
 * Keyword match information
 */
export interface KeywordMatch {
  keyword: string;
  matchedIn: 'subject' | 'body' | 'from';
  matchCount: number;
  context?: string; // Surrounding text for context
}

/**
 * Full inbox capture data
 */
export interface InboxCapture {
  totalMessages: number;
  messages: EmailMessage[];
  folders: string[];
  captureTime: Date;
  storageSize?: number;
}

/**
 * Individual check result for one account
 */
export interface CheckResult {
  account: Account;
  status: 'success' | 'failed' | 'checking' | 'pending';
  isHit: boolean;
  matches?: KeywordMatch[];
  inboxCapture?: InboxCapture;
  error?: string;
  errorType?: 'auth' | 'network' | 'timeout' | 'imap' | 'proxy' | 'unknown';
  timestamp: Date;
  duration?: number; // in milliseconds
  proxyUsed?: ProxyConfig;
}

/**
 * Live statistics during checking process
 */
export interface LiveStats {
  total: number;
  checked: number;
  hits: number;
  fails: number;
  pending: number;
  progress: number; // 0-100 percentage
  startTime: Date;
  estimatedTimeRemaining?: number; // in seconds
  checkRate?: number; // checks per minute
}

/**
 * Checker configuration settings
 */
export interface CheckerConfig {
  keywords: string[];
  searchIn: ('subject' | 'body' | 'from')[];
  maxConcurrent: number;
  timeout: number; // in milliseconds
  useProxy: boolean;
  proxyList: ProxyConfig[];
  proxyRotation: 'random' | 'sequential' | 'round-robin';
  captureFullInbox: boolean;
  maxMessagesToCapture: number;
  retryOnFail: boolean;
  maxRetries: number;
  delayBetweenChecks?: number; // in milliseconds
  imapConfig?: ImapConfig;
}

/**
 * IMAP connection configuration
 */
export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  tls?: {
    rejectUnauthorized: boolean;
  };
  auth?: {
    user: string;
    pass: string;
  };
}

/**
 * API Request body for check endpoint
 */
export interface CheckRequest {
  accounts: Account[];
  config: CheckerConfig;
}

/**
 * API Response from check endpoint
 */
export interface CheckResponse {
  success: boolean;
  results?: CheckResult[];
  stats?: LiveStats;
  error?: string;
  sessionId?: string;
}

/**
 * Real-time update event for streaming results
 */
export interface CheckUpdateEvent {
  type: 'progress' | 'result' | 'stats' | 'error' | 'complete';
  data: CheckResult | LiveStats | { message: string };
  sessionId: string;
  timestamp: Date;
}

/**
 * Proxy validation result
 */
export interface ProxyValidation {
  proxy: ProxyConfig;
  isValid: boolean;
  responseTime?: number; // in milliseconds
  error?: string;
  testedAt: Date;
}

/**
 * Export format options for results
 */
export type ExportFormat = 'json' | 'csv' | 'txt';

/**
 * Export data structure
 */
export interface ExportData {
  format: ExportFormat;
  results: CheckResult[];
  stats: LiveStats;
  exportTime: Date;
  config: CheckerConfig;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean;
  accounts?: Account[];
  error?: string;
  totalLines?: number;
  validLines?: number;
  invalidLines?: number;
}

/**
 * Utility type for async operation status
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Filter options for results display
 */
export interface ResultFilter {
  status?: CheckResult['status'][];
  isHit?: boolean;
  hasMatches?: boolean;
  keywords?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  errorType?: CheckResult['errorType'][];
}

/**
 * Sort options for results
 */
export interface ResultSort {
  field: keyof CheckResult | 'matchCount' | 'messageCount';
  direction: 'asc' | 'desc';
}

/**
 * Pagination state
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Component props types
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Toast notification type
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Session storage for results
 */
export interface CheckerSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  config: CheckerConfig;
  results: CheckResult[];
  stats: LiveStats;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
}

/**
 * Rate limiter state
 */
export interface RateLimitState {
  count: number;
  resetAt: Date;
  isLimited: boolean;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: Date;
  services: {
    imap: boolean;
    proxy: boolean;
    api: boolean;
  };
  uptime?: number;
  responseTime?: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  path?: string;
}

/**
 * Hotmail/Outlook specific IMAP servers
 */
export const HOTMAIL_IMAP_CONFIG: ImapConfig = {
  host: 'outlook.office365.com',
  port: 993,
  secure: true,
  tls: {
    rejectUnauthorized: false,
  },
};

/**
 * Default checker configuration
 */
export const DEFAULT_CHECKER_CONFIG: Partial<CheckerConfig> = {
  searchIn: ['subject', 'body', 'from'],
  maxConcurrent: 5,
  timeout: 30000,
  useProxy: false,
  proxyRotation: 'random',
  captureFullInbox: true,
  maxMessagesToCapture: 50,
  retryOnFail: true,
  maxRetries: 2,
  delayBetweenChecks: 1000,
};

/**
 * Validation schemas (for runtime validation)
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const COMBO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+:.+$/;
export const PROXY_REGEX = /^[^:]+:\d+(:.*)?$/;
