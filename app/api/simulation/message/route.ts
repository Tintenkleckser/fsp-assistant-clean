import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { MessageSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';

/**
 * POST /api/simulation/message
 * Saves a message to a simulation
 */
export const POST = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      // Validate request body
      const body = await req.json();
      const { simulationId, role, content } = MessageSchema.parse(body);

      // Verify simulation exists and belongs to user
      const simulation = await prisma.simulation.findFirst({
        where: {
          id: simulationId,
          userId: user.id,
        },
        select: { id: true, status: true },
      });

      if (!simulation) {
        throw new ApiError(404, 'Simulation not found or access denied', { simulationId });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          role,
          content,
          simulationId,
        },
      });

      logger.info('Message saved to simulation', {
        userId: user.id,
        simulationId,
        messageId: message.id,
        role,
      });

      return NextResponse.json({
        success: true,
        message,
      });
    } catch (error) {
      logger.error('Save message error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

/**
 * GET /api/simulation/message
 * Retrieves messages for a simulation
 */
export const GET = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const simulationId = searchParams.get('simulationId');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      if (!simulationId) {
        throw new ApiError(400, 'simulationId query parameter is required');
      }

      // Verify simulation exists and belongs to user
      const simulation = await prisma.simulation.findFirst({
        where: {
          id: simulationId,
          userId: user.id,
        },
        select: { id: true },
      });

      if (!simulation) {
        throw new ApiError(404, 'Simulation not found or access denied', { simulationId });
      }

      // Get messages
      const messages = await prisma.message.findMany({
        where: { simulationId },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      });

      logger.info('Messages retrieved for simulation', {
        userId: user.id,
        simulationId,
        messageCount: messages.length,
      });

      return NextResponse.json({
        success: true,
        messages,
        count: messages.length,
      });
    } catch (error) {
      logger.error('Get messages error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

/**
 * DELETE /api/simulation/message
 * Deletes a message from a simulation
 */
export const DELETE = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const messageId = searchParams.get('id');

      if (!messageId) {
        throw new ApiError(400, 'id query parameter is required');
      }

      // Verify message exists and belongs to user's simulation
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          simulation: {
            userId: user.id,
          },
        },
        select: { id: true, simulationId: true },
      });

      if (!message) {
        throw new ApiError(404, 'Message not found or access denied', { messageId });
      }

      // Delete message
      await prisma.message.delete({
        where: { id: messageId },
      });

      logger.info('Message deleted from simulation', {
        userId: user.id,
        messageId,
        simulationId: message.simulationId,
      });

      return NextResponse.json({
        success: true,
        message: { id: messageId },
      });
    } catch (error) {
      logger.error('Delete message error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

export const dynamic = 'force-dynamic';