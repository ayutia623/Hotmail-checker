// Proxy Manager Module - Handle proxy rotation, validation, and health monitoring

import { ProxyConfig, ProxyValidation } from './types';
import { getRandomItem, shuffleArray, delay } from './utils';
import axios from 'axios';

/**
 * ProxyManager class for managing proxy pool and rotation
 */
export class ProxyManager {
  private proxies: ProxyConfig[];
  private currentIndex: number = 0;
  private rotationMode: 'random' | 'sequential' | 'round-robin';
  private maxFailCount: number = 3;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    proxies: ProxyConfig[],
    rotationMode: 'random' | 'sequential' | 'round-robin' = 'random',
    maxFailCount: number = 3
  ) {
    this.proxies = proxies.map(p => ({
      ...p,
      isActive: true,
      failCount: 0,
      lastUsed: undefined,
    }));
    this.rotationMode = rotationMode;
    this.maxFailCount = maxFailCount;

    // Shuffle for random mode initialization
    if (this.rotationMode === 'random') {
      this.proxies = shuffleArray(this.proxies);
    }
  }

  /**
   * Get next available proxy based on rotation strategy
   */
  getNextProxy(): ProxyConfig | null {
    const activeProxies = this.getActiveProxies();

    if (activeProxies.length === 0) {
      console.error('No active proxies available');
      return null;
    }

    let proxy: ProxyConfig;

    switch (this.rotationMode) {
      case 'random':
        proxy = getRandomItem(activeProxies) ?? activeProxies[0];
        break;

      case 'sequential':
        proxy = activeProxies[this.currentIndex % activeProxies.length];
        this.currentIndex++;
        break;

      case 'round-robin':
        // Find least recently used proxy
        proxy = activeProxies.reduce((prev, curr) => {
          if (!prev.lastUsed) return prev;
          if (!curr.lastUsed) return curr;
          return prev.lastUsed < curr.lastUsed ? prev : curr;
        });
        break;

      default:
        proxy = activeProxies[0];
    }

    // Update last used timestamp
    proxy.lastUsed = new Date();
    
    return proxy;
  }

  /**
   * Mark proxy as failed and increment fail count
   */
  markProxyFailed(proxy: ProxyConfig): void {
    const proxyIndex = this.proxies.findIndex(
      p => p.host === proxy.host && p.port === proxy.port
    );

    if (proxyIndex !== -1) {
      this.proxies[proxyIndex].failCount = (this.proxies[proxyIndex].failCount ?? 0) + 1;

      // Deactivate if fail count exceeds max
      if ((this.proxies[proxyIndex].failCount ?? 0) >= this.maxFailCount) {
        this.proxies[proxyIndex].isActive = false;
        console.warn(
          `Proxy ${proxy.host}:${proxy.port} deactivated after ${this.maxFailCount} failures`
        );
      }
    }
  }

  /**
   * Mark proxy as successful and reset fail count
   */
  markProxySuccess(proxy: ProxyConfig): void {
    const proxyIndex = this.proxies.findIndex(
      p => p.host === proxy.host && p.port === proxy.port
    );

    if (proxyIndex !== -1) {
      this.proxies[proxyIndex].failCount = 0;
      this.proxies[proxyIndex].isActive = true;
    }
  }

  /**
   * Get all active proxies
   */
  getActiveProxies(): ProxyConfig[] {
    return this.proxies.filter(p => p.isActive !== false);
  }

  /**
   * Get all proxies (including inactive)
   */
  getAllProxies(): ProxyConfig[] {
    return [...this.proxies];
  }

  /**
   * Get proxy statistics
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    totalFailures: number;
  } {
    const active = this.getActiveProxies().length;
    const totalFailures = this.proxies.reduce((sum, p) => sum + (p.failCount ?? 0), 0);

    return {
      total: this.proxies.length,
      active,
      inactive: this.proxies.length - active,
      totalFailures,
    };
  }

  /**
   * Validate a single proxy
   */
  async validateProxy(
    proxy: ProxyConfig,
    testUrl: string = 'https://www.google.com'
  ): Promise<ProxyValidation> {
    const startTime = Date.now();

    try {
      const proxyUrl = this.buildProxyUrl(proxy);

      const response = await axios.get(testUrl, {
        proxy: false, // Disable axios default proxy
        httpsAgent: this.createProxyAgent(proxy),
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 500,
      });

      const responseTime = Date.now() - startTime;

      if (response.status >= 200 && response.status < 300) {
        return {
          proxy,
          isValid: true,
          responseTime,
          testedAt: new Date(),
        };
      }

      return {
        proxy,
        isValid: false,
        error: `HTTP ${response.status}`,
        testedAt: new Date(),
      };
    } catch (error) {
      return {
        proxy,
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testedAt: new Date(),
      };
    }
  }

  /**
   * Validate all proxies concurrently
   */
  async validateAllProxies(
    testUrl?: string,
    maxConcurrent: number = 5
  ): Promise<ProxyValidation[]> {
    const results: ProxyValidation[] = [];
    const chunks: ProxyConfig[][] = [];

    // Split into chunks for concurrent validation
    for (let i = 0; i < this.proxies.length; i += maxConcurrent) {
      chunks.push(this.proxies.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(proxy => this.validateProxy(proxy, testUrl))
      );
      results.push(...chunkResults);

      // Small delay between chunks
      await delay(500);
    }

    // Update proxy status based on validation
    results.forEach(result => {
      if (result.isValid) {
        this.markProxySuccess(result.proxy);
      } else {
        this.markProxyFailed(result.proxy);
      }
    });

    return results;
  }

  /**
   * Start periodic health checks for all proxies
   */
  startHealthMonitoring(intervalMinutes: number = 5, testUrl?: string): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    this.healthCheckInterval = setInterval(async () => {
      console.log('Running proxy health check...');
      const results = await this.validateAllProxies(testUrl);
      const validCount = results.filter(r => r.isValid).length;
      console.log(
        `Health check complete: ${validCount}/${results.length} proxies healthy`
      );
    }, intervalMs);

    // Run initial health check
    this.validateAllProxies(testUrl).catch(console.error);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Reset all proxy fail counts
   */
  resetAllProxies(): void {
    this.proxies.forEach(proxy => {
      proxy.failCount = 0;
      proxy.isActive = true;
    });
  }

  /**
   * Add new proxy to pool
   */
  addProxy(proxy: ProxyConfig): void {
    const exists = this.proxies.some(
      p => p.host === proxy.host && p.port === proxy.port
    );

    if (!exists) {
      this.proxies.push({
        ...proxy,
        isActive: true,
        failCount: 0,
      });
    }
  }

  /**
   * Remove proxy from pool
   */
  removeProxy(host: string, port: number): boolean {
    const index = this.proxies.findIndex(
      p => p.host === host && p.port === port
    );

    if (index !== -1) {
      this.proxies.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Build proxy URL string
   */
  private buildProxyUrl(proxy: ProxyConfig): string {
    const protocol = proxy.protocol ?? 'http';
    const auth = proxy.username && proxy.password
      ? `${proxy.username}:${proxy.password}@`
      : '';

    return `${protocol}://${auth}${proxy.host}:${proxy.port}`;
  }

  /**
   * Create proxy agent for axios (simplified, real implementation needs http-proxy-agent)
   */
  private createProxyAgent(proxy: ProxyConfig): any {
    // Note: In real implementation, use libraries like:
    // - http-proxy-agent for HTTP proxies
    // - https-proxy-agent for HTTPS proxies  
    // - socks-proxy-agent for SOCKS proxies
    // This is a placeholder that returns proxy config for axios
    
    const auth = proxy.username && proxy.password
      ? { username: proxy.username, password: proxy.password }
      : undefined;

    return {
      host: proxy.host,
      port: proxy.port,
      auth,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopHealthMonitoring();
    this.proxies = [];
  }
}

/**
 * Create ProxyManager instance with validation
 */
export function createProxyManager(
  proxies: ProxyConfig[],
  options?: {
    rotationMode?: 'random' | 'sequential' | 'round-robin';
    maxFailCount?: number;
    autoHealthCheck?: boolean;
    healthCheckInterval?: number;
  }
): ProxyManager {
  const manager = new ProxyManager(
    proxies,
    options?.rotationMode ?? 'random',
    options?.maxFailCount ?? 3
  );

  if (options?.autoHealthCheck) {
    manager.startHealthMonitoring(options?.healthCheckInterval ?? 5);
  }

  return manager;
}

/**
 * Test proxy connection with retry
 */
export async function testProxyConnection(
  proxy: ProxyConfig,
  retries: number = 2
): Promise<boolean> {
  const manager = new ProxyManager([proxy]);

  for (let i = 0; i <= retries; i++) {
    const result = await manager.validateProxy(proxy);
    
    if (result.isValid) {
      return true;
    }

    if (i < retries) {
      await delay(1000 * (i + 1)); // Exponential backoff
    }
  }

  return false;
}

/**
 * Format proxy for display
 */
export function formatProxy(proxy: ProxyConfig): string {
  const auth = proxy.username ? `${proxy.username}:***@` : '';
  return `${proxy.protocol ?? 'http'}://${auth}${proxy.host}:${proxy.port}`;
}

/**
 * Parse proxy string to ProxyConfig
 */
export function parseProxyString(proxyStr: string): ProxyConfig | null {
  try {
    // Format: protocol://user:pass@host:port or host:port:user:pass or host:port
    const parts = proxyStr.trim().split(':');

    if (parts.length < 2) {
      return null;
    }

    // Simple format: host:port or host:port:user:pass
    if (!proxyStr.includes('://')) {
      const [host, portStr, username, password] = parts;
      const port = parseInt(portStr, 10);

      if (isNaN(port) || port <= 0 || port > 65535) {
        return null;
      }

      return {
        host: host.trim(),
        port,
        username: username?.trim(),
        password: password?.trim(),
        protocol: 'http',
        isActive: true,
        failCount: 0,
      };
    }

    // URL format: protocol://user:pass@host:port
    const url = new URL(proxyStr);
    const port = parseInt(url.port, 10);

    if (isNaN(port) || port <= 0 || port > 65535) {
      return null;
    }

    return {
      host: url.hostname,
      port,
      username: url.username || undefined,
      password: url.password || undefined,
      protocol: url.protocol.replace(':', '') as ProxyConfig['protocol'],
      isActive: true,
      failCount: 0,
    };
  } catch (error) {
    console.error('Failed to parse proxy string:', error);
    return null;
  }
}

/**
 * Batch parse multiple proxy strings
 */
export function parseProxyList(proxyList: string[]): ProxyConfig[] {
  return proxyList
    .map(parseProxyString)
    .filter((proxy): proxy is ProxyConfig => proxy !== null);
}

/**
 * Get proxy health status color
 */
export function getProxyHealthColor(proxy: ProxyConfig): string {
  if (!proxy.isActive) {
    return 'text-red-500';
  }

  const failCount = proxy.failCount ?? 0;
  
  if (failCount === 0) {
    return 'text-green-500';
  } else if (failCount < 2) {
    return 'text-yellow-500';
  } else {
    return 'text-orange-500';
  }
}

/**
 * Check if proxy pool has healthy proxies
 */
export function hasHealthyProxies(proxies: ProxyConfig[]): boolean {
  return proxies.some(p => p.isActive !== false && (p.failCount ?? 0) < 3);
}

/**
 * Get recommended proxy count based on account count
 */
export function getRecommendedProxyCount(accountCount: number): number {
  // Recommendation: 1 proxy per 10 accounts minimum
  return Math.max(1, Math.ceil(accountCount / 10));
}
