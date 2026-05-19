// API Route: /api/check - Handle account checking requests

import { NextRequest, NextResponse } from 'next/server';
import { batchCheckAccounts } from '@/lib/hotmail-checker';
import { createProxyManager } from '@/lib/proxy-manager';
import type {
  CheckRequest,
  CheckResponse,
  CheckResult,
  LiveStats,
  CheckerConfig,
} from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

// Store active sessions (in production, use Redis or similar)
const activeSessions = new Map<string, {
  results: CheckResult[];
  stats: LiveStats;
  status: 'running' | 'completed' | 'cancelled';
}>();

/**
 * POST /api/check - Start checking accounts
 */
export async function POST(request: NextRequest): Promise<NextResponse<CheckResponse>> {
  try {
    // Parse request body
    const body = await request.json() as CheckRequest;

    // Validate request
    const validation = validateCheckRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    const { accounts, config } = body;

    // Generate session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize session
    const startTime = new Date();
    const stats: LiveStats = {
      total: accounts.length,
      checked: 0,
      hits: 0,
      fails: 0,
      pending: accounts.length,
      progress: 0,
      startTime,
      estimatedTimeRemaining: 0,
      checkRate: 0,
    };

    activeSessions.set(sessionId, {
      results: [],
      stats,
      status: 'running',
    });

    // Initialize proxy manager if proxies enabled
    let proxyManager = null;
    if (config.useProxy && config.proxyList.length > 0) {
      proxyManager = createProxyManager(config.proxyList, {
        rotationMode: config.proxyRotation,
        maxFailCount: 3,
      });
    }

    // Start checking in background (don't await)
    performChecking(sessionId, accounts, config, proxyManager).catch((error) => {
      console.error('Checking failed:', error);
      const session = activeSessions.get(sessionId);
      if (session) {
        session.status = 'completed';
      }
    });

    // Return immediate response with session ID
    return NextResponse.json({
      success: true,
      sessionId,
      stats,
    });

  } catch (error) {
    console.error('Check API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/check?sessionId=xxx - Get checking progress/results
 */
export async function GET(request: NextRequest): Promise<NextResponse<CheckResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    const session = activeSessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Return current state
    return NextResponse.json({
      success: true,
      results: session.results,
      stats: session.stats,
      sessionId,
    });

  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/check?sessionId=xxx - Cancel checking session
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean; message?: string; error?: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    const session = activeSessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Mark as cancelled
    session.status = 'cancelled';

    // Clean up after delay
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 60000); // Clean up after 1 minute

    return NextResponse.json({
      success: true,
      message: 'Session cancelled',
    });

  } catch (error) {
    console.error('Cancel session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Perform actual checking process
 */
async function performChecking(
  sessionId: string,
  accounts: CheckRequest['accounts'],
  config: CheckerConfig,
  proxyManager: any
): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  try {
    // Update config with proxy manager if available
    const checkConfig = { ...config };
    if (proxyManager) {
      checkConfig.proxyList = proxyManager.getActiveProxies();
    }

    // Start batch checking with callbacks
    await batchCheckAccounts(
      accounts,
      checkConfig,
      // Progress callback
      (result, progress) => {
        const currentSession = activeSessions.get(sessionId);
        if (!currentSession || currentSession.status === 'cancelled') {
          throw new Error('Session cancelled');
        }

        // Add result
        currentSession.results.push(result);

        // Update stats
        currentSession.stats.checked++;
        currentSession.stats.progress = progress;
        currentSession.stats.pending = accounts.length - currentSession.stats.checked;

        if (result.isHit) {
          currentSession.stats.hits++;
        }

        if (result.status === 'failed') {
          currentSession.stats.fails++;
        }

        // Calculate check rate and ETA
        const elapsed = Date.now() - currentSession.stats.startTime.getTime();
        const rate = (currentSession.stats.checked / elapsed) * 60000; // per minute
        currentSession.stats.checkRate = Math.round(rate * 100) / 100;

        const remaining = accounts.length - currentSession.stats.checked;
        const eta = remaining > 0 ? Math.ceil((remaining / rate) * 60) : 0;
        currentSession.stats.estimatedTimeRemaining = eta;

        // Update proxy manager on result
        if (proxyManager && result.proxyUsed) {
          if (result.status === 'success') {
            proxyManager.markProxySuccess(result.proxyUsed);
          } else if (result.errorType === 'proxy' || result.errorType === 'network') {
            proxyManager.markProxyFailed(result.proxyUsed);
          }
        }
      },
      // Stats callback
      (stats) => {
        const currentSession = activeSessions.get(sessionId);
        if (currentSession) {
          currentSession.stats.hits = stats.hits;
          currentSession.stats.fails = stats.fails;
        }
      }
    );

    // Mark as completed
    if (session) {
      session.status = 'completed';
      session.stats.progress = 100;
      session.stats.estimatedTimeRemaining = 0;
    }

  } catch (error) {
    console.error('Batch checking error:', error);
    if (session) {
      session.status = 'completed';
    }
  } finally {
    // Cleanup proxy manager
    if (proxyManager) {
      proxyManager.destroy();
    }

    // Schedule session cleanup
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 3600000); // Clean up after 1 hour
  }
}

/**
 * Validate check request
 */
function validateCheckRequest(body: any): { valid: boolean; error?: string } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!Array.isArray(body.accounts) || body.accounts.length === 0) {
    return { valid: false, error: 'Accounts array is required and must not be empty' };
  }

  if (body.accounts.length > 1000) {
    return { valid: false, error: 'Maximum 1000 accounts per request' };
  }

  // Validate each account
  for (const account of body.accounts) {
    if (!account.email || !account.password) {
      return { valid: false, error: 'Each account must have email and password' };
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
      return { valid: false, error: `Invalid email format: ${account.email}` };
    }
  }

  if (!body.config) {
    return { valid: false, error: 'Config is required' };
  }

  if (!Array.isArray(body.config.keywords) || body.config.keywords.length === 0) {
    return { valid: false, error: 'Keywords array is required and must not be empty' };
  }

  if (typeof body.config.maxConcurrent !== 'number' || body.config.maxConcurrent < 1) {
    return { valid: false, error: 'maxConcurrent must be a positive number' };
  }

  if (body.config.maxConcurrent > 20) {
    return { valid: false, error: 'maxConcurrent cannot exceed 20' };
  }

  return { valid: true };
}

/**
 * Clean up old sessions periodically
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of Array.from(activeSessions.entries())) {
      const age = now - session.stats.startTime.getTime();
      // Remove completed sessions older than 1 hour
      if (session.status === 'completed' && age > 3600000) {
        activeSessions.delete(sessionId);
      }
      // Remove stale running sessions older than 2 hours
      if (session.status === 'running' && age > 7200000) {
        activeSessions.delete(sessionId);
      }
    }
  }, 600000); // Run every 10 minutes
}
