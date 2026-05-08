import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { UpdateProfileSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';

/**
 * GET /api/profile/preferences
 * Retrieves user preferences
 */
export const GET = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const profile = await prisma.profile.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          preferences: true,
        },
      });

      logger.info('User preferences retrieved', {
        userId: user.id,
        hasPreferences: !!profile?.preferences,
      });

      return NextResponse.json({
        success: true,
        preferences: profile?.preferences || {},
      });
    } catch (error) {
      logger.error('Get user preferences error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

/**
 * PUT /api/profile/preferences
 * Updates user preferences
 */
export const PUT = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const { preferences } = body;

      if (!preferences || typeof preferences !== 'object') {
        throw new ApiError(400, 'Valid preferences object is required');
      }

      // Find or create profile
      let profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!profile) {
        // Create profile if it doesn't exist
        profile = await prisma.profile.create({
          data: {
            userId: user.id,
            preferences: preferences as any,
          },
          select: { id: true },
        });
      } else {
        // Update existing profile
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            preferences: preferences as any,
          },
        });
      }

      logger.info('User preferences updated', {
        userId: user.id,
        profileId: profile.id,
        preferenceKeys: Object.keys(preferences),
      });

      return NextResponse.json({
        success: true,
        message: 'Preferences updated successfully',
        preferences,
      });
    } catch (error) {
      logger.error('Update user preferences error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

/**
 * PATCH /api/profile/preferences
 * Partially updates user preferences
 */
export const PATCH = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const updates = body;

      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        throw new ApiError(400, 'Valid updates object is required');
      }

      // Find or create profile
      let profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true, preferences: true },
      });

      if (!profile) {
        // Create profile with the updates
        profile = await prisma.profile.create({
          data: {
            userId: user.id,
            preferences: updates as any,
          },
          select: { id: true, preferences: true },
        });
      } else {
        // Merge updates with existing preferences
        const mergedPreferences = {
          ...(profile.preferences as object || {}),
          ...updates,
        };

        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: {
            preferences: mergedPreferences as any,
          },
          select: { id: true, preferences: true },
        });
      }

      logger.info('User preferences partially updated', {
        userId: user.id,
        profileId: profile.id,
        updatedKeys: Object.keys(updates),
      });

      return NextResponse.json({
        success: true,
        message: 'Preferences partially updated successfully',
        preferences: profile.preferences,
      });
    } catch (error) {
      logger.error('Patch user preferences error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

export const dynamic = 'force-dynamic';