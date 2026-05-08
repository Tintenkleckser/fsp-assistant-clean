import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { PaginationSchema, CreateTemplateSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import { cache } from 'react';

/**
 * GET /api/templates
 * Retrieves all templates, optionally filtered by category or difficulty
 */
const getTemplates = cache(async (
  where: any,
  include: any,
  orderBy: any,
  take: number,
  skip: number
) => {
  return prisma.simulationTemplate.findMany({
    where,
    include,
    orderBy,
    take,
    skip,
  });
});

const countTemplates = cache(async (where: any) => {
  return prisma.simulationTemplate.count({ where });
});

export const GET = async (req: Request) => {
  return withAuth(async () => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Parse and validate pagination parameters
      const { page = 1, limit = 20 } = PaginationSchema.parse({
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
      });

      const category = searchParams.get('category');
      const difficulty = searchParams.get('difficulty');
      const type = searchParams.get('type');

      // Build where clause
      const where: any = {};
      
      if (category) where.category = category;
      if (difficulty) where.difficulty = difficulty;
      if (type) where.type = type;

      // Get templates with caching
      const [templates, total] = await Promise.all([
        getTemplates(
          where,
          {
            _count: {
              select: { simulations: true },
            },
          },
          { createdAt: 'desc' },
          limit,
          (page - 1) * limit
        ),
        countTemplates(where),
      ]);

      logger.info('Templates retrieved', {
        count: templates.length,
        total,
        page,
        limit,
      });

      return NextResponse.json({
        success: true,
        data: templates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get templates error', { error });
      return handleError(error);
    }
  });
};

/**
 * POST /api/templates
 * Creates a new template (admin only)
 */
export const POST = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      // In a real app, you would check if user is admin
      // For now, we'll allow all authenticated users
      
      const body = await req.json();
      const templateData = CreateTemplateSchema.parse(body);

      // Create template
      const template = await prisma.simulationTemplate.create({
        data: {
          ...templateData,
          domain: templateData.domain || 'medicine',
        },
      });

      // Clear cache for templates
      // Note: In a real app, you might want to implement a more sophisticated cache invalidation
      
      logger.info('Template created', {
        userId: user.id,
        templateId: template.id,
        type: template.type,
      });

      return NextResponse.json({
        success: true,
        template,
      }, { status: 201 });
    } catch (error) {
      logger.error('Create template error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

/**
 * GET /api/templates/[id]
 * Retrieves a single template by ID
 */
export const GET_BY_ID = async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  return withAuth(async () => {
    try {
      const { id } = await params;
      
      if (!id) {
        throw new ApiError(400, 'Template ID is required');
      }

      const template = await prisma.simulationTemplate.findUnique({
        where: { id },
        include: {
          _count: {
            select: { simulations: true },
          },
        },
      });

      if (!template) {
        throw new ApiError(404, 'Template not found', { id });
      }

      logger.info('Template retrieved by ID', { templateId: id });

      return NextResponse.json({
        success: true,
        template,
      });
    } catch (error) {
      logger.error('Get template by ID error', { error });
      return handleError(error);
    }
  });
};

export const dynamic = 'force-dynamic';