import { NextResponse } from 'next/server';
import { withAuth, handleError, ApiError } from '@/lib/api/middleware';
import { prisma } from '@/lib/db';
import { EvaluateRequestSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import { mistral } from '@/lib/mistral';

/**
 * POST /api/simulation/evaluate
 * Evaluates a completed simulation using AI
 */
export const POST = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      // Validate request body
      const body = await req.json();
      const { simulationId, criteria } = EvaluateRequestSchema.parse(body);

      // Verify simulation exists and belongs to user
      const simulation = await prisma.simulation.findFirst({
        where: {
          id: simulationId,
          userId: user.id,
        },
        include: {
          template: {
            select: {
              evaluationCriteria: true,
              type: true,
              difficulty: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!simulation) {
        throw new ApiError(404, 'Simulation not found or access denied', { simulationId });
      }

      logger.info('Simulation evaluation started', {
        userId: user.id,
        simulationId,
        messageCount: simulation.messages.length,
      });

      // Build evaluation context
      const messagesForEvaluation = simulation.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Add system prompt for evaluation
      const systemPrompt = `Du bist ein strenger Prüfer für die deutsche Fachsprachenprüfung (FSP).
Bewerte die folgende Simulation nach den Kriterien: ${JSON.stringify(simulation.template?.evaluationCriteria?.criteria || criteria || [])}.

Gib eine detaillierte Bewertung mit:
1. Gesamtpunktzahl (0-100)
2. Feedback zu Stärken und Schwächen
3. Detaillierte Bewertung pro Kriterium (0-100)

Antworte als valides JSON:`;

      messagesForEvaluation.unshift({
        role: 'system' as const,
        content: systemPrompt,
      });

      // Get evaluation from Mistral
      const response = await mistral.generate({
        messages: messagesForEvaluation,
        options: {
          temperature: 0.3, // More deterministic for evaluations
          maxTokens: 2000,
        },
      });

      // Parse evaluation response
      let evaluationData;
      try {
        const content = response.choices?.[0]?.message?.content || '{}';
        // Extract JSON from response
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        const jsonContent = content.slice(jsonStart, jsonEnd);
        evaluationData = JSON.parse(jsonContent);
      } catch (parseError) {
        logger.warn('Failed to parse evaluation response, using fallback', { parseError });
        // Fallback evaluation
        evaluationData = {
          score: 75,
          feedback: 'Die Auswertung konnte nicht automatisch durchgeführt werden. Bitte überprüfe die Simulation manuell.',
          criteria: {},
        };
      }

      // Save evaluation to database
      const evaluation = await prisma.evaluation.create({
        data: {
          simulationId,
          userId: user.id,
          score: evaluationData.score || 0,
          feedback: evaluationData.feedback || '',
          criteria: evaluationData.criteria || {},
          completedAt: new Date(),
        },
      });

      // Update simulation status
      await prisma.simulation.update({
        where: { id: simulationId },
        data: { status: 'completed' },
      });

      logger.info('Simulation evaluation completed', {
        userId: user.id,
        simulationId,
        evaluationId: evaluation.id,
        score: evaluation.score,
      });

      return NextResponse.json({
        success: true,
        evaluation,
        simulation: {
          id: simulation.id,
          status: 'completed',
        },
      });
    } catch (error) {
      logger.error('Simulation evaluation error', {
        error,
        userId: user?.id,
        requestBody: await req.json().catch(() => null),
      });
      return handleError(error);
    }
  });
};

// GET endpoint to retrieve evaluation for a simulation
export const GET = async (req: Request) => {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const simulationId = searchParams.get('simulationId');

      if (!simulationId) {
        throw new ApiError(400, 'simulationId query parameter is required');
      }

      // Verify simulation exists and belongs to user
      const evaluation = await prisma.evaluation.findFirst({
        where: {
          simulationId,
          simulation: {
            userId: user.id,
          },
        },
        include: {
          simulation: {
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          },
        },
      });

      if (!evaluation) {
        throw new ApiError(404, 'Evaluation not found or access denied', { simulationId });
      }

      return NextResponse.json(evaluation);
    } catch (error) {
      logger.error('Get evaluation error', {
        error,
        userId: user?.id,
      });
      return handleError(error);
    }
  });
};

export const dynamic = 'force-dynamic';