import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { CreateCoachProfileSchema, UpdateCoachProfileSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';

/**
 * GET /api/profile/coach
 * Retrieves the coach profile for the authenticated user
 */
export const GET = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const coachProfile = await prisma.coachProfile.findUnique({
        where: {
          userId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!coachProfile) {
        throw new ApiError(404, 'Coach profile not found for this user');
      }

      logger.info('Coach profile retrieved', {
        userId: user.id,
        coachProfileId: coachProfile.id,
      });

      return NextResponse.json({
        success: true,
        coachProfile,
      });
    } catch (error) {
      logger.error('Get coach profile error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

/**
 * POST /api/profile/coach
 * Creates a coach profile for the authenticated user
 */
export const POST = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const coachData = CreateCoachProfileSchema.parse(body);

      // Check if coach profile already exists
      const existingProfile = await prisma.coachProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (existingProfile) {
        throw new ApiError(409, 'Coach profile already exists for this user', {
          coachProfileId: existingProfile.id,
        });
      }

      // Create coach profile
      const coachProfile = await prisma.coachProfile.create({
        data: {
          userId: user.id,
          ...coachData,
        },
      });

      logger.info('Coach profile created', {
        userId: user.id,
        coachProfileId: coachProfile.id,
      });

      return NextResponse.json({
        success: true,
        coachProfile,
      }, { status: 201 });
    } catch (error) {
      logger.error('Create coach profile error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

/**
 * PUT /api/profile/coach
 * Updates the coach profile for the authenticated user
 */
export const PUT = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const coachData = UpdateCoachProfileSchema.parse(body);

      // Find and update coach profile
      const coachProfile = await prisma.coachProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!coachProfile) {
        throw new ApiError(404, 'Coach profile not found for this user');
      }

      const updatedProfile = await prisma.coachProfile.update({
        where: { id: coachProfile.id },
        data: coachData,
      });

      logger.info('Coach profile updated', {
        userId: user.id,
        coachProfileId: coachProfile.id,
      });

      return NextResponse.json({
        success: true,
        coachProfile: updatedProfile,
      });
    } catch (error) {
      logger.error('Update coach profile error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

/**
 * DELETE /api/profile/coach
 * Deletes the coach profile for the authenticated user
 */
export const DELETE = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      // Find and delete coach profile
      const coachProfile = await prisma.coachProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!coachProfile) {
        throw new ApiError(404, 'Coach profile not found for this user');
      }

      await prisma.coachProfile.delete({
        where: { id: coachProfile.id },
      });

      logger.info('Coach profile deleted', {
        userId: user.id,
        coachProfileId: coachProfile.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Coach profile deleted successfully',
      });
    } catch (error) {
      logger.error('Delete coach profile error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

export const dynamic = 'force-dynamic';