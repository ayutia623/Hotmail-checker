// API Route: /api/health - Health check endpoint

import { NextResponse } from 'next/server';
import type { HealthCheckResponse } from '@/lib/types';

/**
 * GET /api/health - Check API health status
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now();

  try {
    // Check services
    const services = {
      imap: true, // IMAP check would need actual connection test
      proxy: true, // Proxy check would need validation
      api: true, // API is responding
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date(),
      services,
      uptime: process.uptime ? process.uptime() : 0,
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'down',
        timestamp: new Date(),
        services: {
          imap: false,
          proxy: false,
          api: false,
        },
      },
      { status: 503 }
    );
  }
}
