import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { PaginationSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';

/**
 * GET /api/simulations
 * Retrieves all simulations for the authenticated user
 */
export const GET = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Parse and validate pagination parameters
      const { page = 1, limit = 10 } = PaginationSchema.parse({
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      });

      const status = searchParams.get('status');
      const templateId = searchParams.get('templateId');

      // Build where clause
      const where: any = { userId: user.id };
      
      if (status) {
        where.status = status;
      }
      
      if (templateId) {
        where.templateId = templateId;
      }

      // Get simulations with pagination
      const [simulations, total] = await Promise.all([
        prisma.simulation.findMany({
          where,
          include: {
            template: {
              select: {
                id: true,
                titleDe: true,
                titleTr: true,
                type: true,
                difficulty: true,
              },
            },
            _count: {
              select: { messages: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.simulation.count({ where }),
      ]);

      logger.info('Simulations retrieved for user', {
        userId: user.id,
        count: simulations.length,
        total,
        page,
        limit,
      });

      return NextResponse.json({
        success: true,
        data: simulations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get simulations error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

/**
 * POST /api/simulations
 * Creates a new simulation
 */
export const POST = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const { templateId, title } = body;

      if (!templateId) {
        throw new ApiError(400, 'templateId is required');
      }

      // Verify template exists
      const template = await prisma.simulationTemplate.findUnique({
        where: { id: templateId },
        select: { id: true },
      });

      if (!template) {
        throw new ApiError(404, 'Template not found', { templateId });
      }

      // Create simulation
      const simulation = await prisma.simulation.create({
        data: {
          templateId,
          userId: user.id,
          title: title || `Simulation - ${new Date().toLocaleDateString('de-DE')}`,
          status: 'pending',
        },
      });

      logger.info('Simulation created', {
        userId: user.id,
        simulationId: simulation.id,
        templateId,
      });

      return NextResponse.json({
        success: true,
        simulation,
      }, { status: 201 });
    } catch (error) {
      logger.error('Create simulation error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

/**
 * DELETE /api/simulations
 * Deletes a simulation
 */
export const DELETE = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const simulationId = searchParams.get('id');

      if (!simulationId) {
        throw new ApiError(400, 'id query parameter is required');
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

      // Delete simulation and all related messages
      await prisma.simulation.delete({
        where: { id: simulationId },
      });

      logger.info('Simulation deleted', {
        userId: user.id,
        simulationId,
      });

      return NextResponse.json({
        success: true,
        message: 'Simulation deleted successfully',
      });
    } catch (error) {
      logger.error('Delete simulation error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

export const dynamic = 'force-dynamic';