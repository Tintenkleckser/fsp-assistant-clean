import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { AssistRequestSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import { mistral } from '@/lib/mistral';

/**
 * POST /api/simulation/assist
 * Provides AI assistance during a simulation
 * Uses streaming for real-time response delivery
 */
export const POST = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      // Validate request body
      const body = await req.json();
      const { simulationId, message } = AssistRequestSchema.parse(body);

      // Verify simulation exists and belongs to user
      const simulation = await prisma.simulation.findFirst({
        where: {
          id: simulationId,
          userId: user.id,
        },
        include: {
          template: {
            select: {
              systemPrompt: true,
              type: true,
              difficulty: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 10, // Limit context window
          },
        },
      });

      if (!simulation) {
        throw new ApiError(404, 'Simulation not found or access denied', { simulationId });
      }

      logger.info('AI assistance requested', {
        userId: user.id,
        simulationId,
        messageLength: message.length,
      });

      // Build context from previous messages
      const contextMessages = simulation.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Add system prompt if available
      if (simulation.template?.systemPrompt) {
        contextMessages.unshift({
          role: 'system' as const,
          content: simulation.template.systemPrompt,
        });
      }

      // Add current user message
      contextMessages.push({ role: 'user' as const, content: message });

      // Get streaming response from Mistral
      const stream = await mistral.stream({
        messages: contextMessages,
        options: {
          temperature: 0.7,
          maxTokens: 1000,
        },
      });

      // Save user message to database
      await prisma.message.create({
        data: {
          role: 'user',
          content: message,
          simulationId,
        },
      });

      logger.info('AI assistance streaming started', {
        userId: user.id,
        simulationId,
      });

      // Return streaming response
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      logger.error('AI assistance error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

// Disable GET for this endpoint
export const GET = async () => {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
};

export const dynamic = 'force-dynamic';