// API Route: /api/proxy - Handle proxy validation and management

import { NextRequest, NextResponse } from 'next/server';
import { createProxyManager, parseProxyString } from '@/lib/proxy-manager';
import type { ProxyConfig, ProxyValidation } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

/**
 * POST /api/proxy/validate - Validate proxy list
 */
export async function POST(request: NextRequest): Promise<NextResponse<{
  success: boolean;
  validations?: ProxyValidation[];
  error?: string;
}>> {
  try {
    const body = await request.json();

    // Validate request
    if (!Array.isArray(body.proxies) || body.proxies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proxies array is required',
        },
        { status: 400 }
      );
    }

    if (body.proxies.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 100 proxies can be validated at once',
        },
        { status: 400 }
      );
    }

    // Parse proxy strings to ProxyConfig
    const proxies: ProxyConfig[] = [];
    for (const proxyStr of body.proxies) {
      if (typeof proxyStr === 'string') {
        const proxy = parseProxyString(proxyStr);
        if (proxy) {
          proxies.push(proxy);
        }
      } else if (typeof proxyStr === 'object') {
        proxies.push(proxyStr as ProxyConfig);
      }
    }

    if (proxies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid proxies found',
        },
        { status: 400 }
      );
    }

    // Create proxy manager and validate
    const manager = createProxyManager(proxies, {
      rotationMode: 'random',
      maxFailCount: 1,
    });

    const testUrl = body.testUrl || 'https://www.google.com';
    const maxConcurrent = body.maxConcurrent || 5;

    const validations = await manager.validateAllProxies(testUrl, maxConcurrent);

    // Clean up
    manager.destroy();

    return NextResponse.json({
      success: true,
      validations,
    });

  } catch (error) {
    console.error('Proxy validation error:', error);
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
 * GET /api/proxy/test - Test single proxy
 */
export async function GET(request: NextRequest): Promise<NextResponse<{
  success: boolean;
  validation?: ProxyValidation;
  error?: string;
}>> {
  try {
    const { searchParams } = new URL(request.url);
    const proxyStr = searchParams.get('proxy');

    if (!proxyStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proxy parameter is required',
        },
        { status: 400 }
      );
    }

    // Parse proxy
    const proxy = parseProxyString(proxyStr);

    if (!proxy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid proxy format',
        },
        { status: 400 }
      );
    }

    // Validate proxy
    const manager = createProxyManager([proxy]);
    const testUrl = searchParams.get('testUrl') || 'https://www.google.com';
    const validation = await manager.validateProxy(proxy, testUrl);

    // Clean up
    manager.destroy();

    return NextResponse.json({
      success: true,
      validation,
    });

  } catch (error) {
    console.error('Proxy test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
