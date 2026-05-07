import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Centralized authentication middleware for API routes
 * Wraps route handlers with user authentication
 */
export async function withAuth(
  handler: (user: { id: string; email: string; [key: string]: any }) => Promise<Response | NextResponse>
) {
  const supabase = getServerClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      logger.warn('Unauthorized access attempt', { error: error?.message });
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(user);
  } catch (authError) {
    logger.error('Authentication middleware error', { error: authError });
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Error handling utility for API routes
 * Standardizes error responses
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleError(error: unknown): NextResponse {
  logger.error('API Error', { error });

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details && { details: error.details }),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Internal Server Error', message: 'An unknown error occurred' },
    { status: 500 }
  );
}

/**
 * Rate limiting middleware (placeholder - requires Upstash Redis setup)
 * Uncomment and configure when ready to implement
 */
/*
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL! });
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function withRateLimit(handler: () => Promise<Response>) {
  const ip = headers().get('x-forwarded-for') || headers().get('x-real-ip') || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  return handler();
}
*/