import { z } from 'zod';

// ============================================
// User Schemas
// ============================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().max(100).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true, updatedAt: true });

export const UpdateUserSchema = CreateUserSchema.partial();

// ============================================
// Authentication Schemas
// ============================================

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const RegisterSchema = LoginSchema.extend({
  name: z.string().min(2).max(100),
});

// ============================================
// Simulation Schemas
// ============================================

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(4000), // Mistral's context window limit
  timestamp: z.date().optional(),
});

export const SimulationSchema = z.object({
  id: z.string().uuid().optional(),
  templateId: z.string().uuid(),
  userId: z.string().uuid(),
  messages: z.array(MessageSchema),
  title: z.string().min(3).max(200).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'error']).default('pending'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateSimulationSchema = SimulationSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const UpdateSimulationSchema = SimulationSchema.partial();

// API Request Schemas
export const GenerateSimulationRequestSchema = z.object({
  templateId: z.string().uuid(),
  messages: z.array(MessageSchema),
  options: z.object({
    temperature: z.number().min(0).max(1).default(0.7),
    maxTokens: z.number().min(1).max(4000).default(1000),
  }).optional(),
});

export const AssistRequestSchema = z.object({
  simulationId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

export const EvaluateRequestSchema = z.object({
  simulationId: z.string().uuid(),
  criteria: z.array(z.string()).optional(),
});

// ============================================
// Template Schemas
// ============================================

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000),
  category: z.string().max(100),
  topic: z.string().max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  estimatedDuration: z.number().int().positive().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateTemplateSchema = TemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================
// Profile Schemas
// ============================================

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  organization: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  preferences: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateProfileSchema = ProfileSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateProfileSchema = CreateProfileSchema.partial();

// ============================================
// Evaluation Schemas
// ============================================

export const EvaluationSchema = z.object({
  id: z.string().uuid(),
  simulationId: z.string().uuid(),
  userId: z.string().uuid(),
  score: z.number().min(0).max(100),
  feedback: z.string().max(5000).optional(),
  criteria: z.record(z.number()).optional(),
  completedAt: z.date().optional(),
});

export const CreateEvaluationSchema = EvaluationSchema.omit({
  id: true,
  userId: true,
  completedAt: true,
});

// ============================================
// Coach Profile Schemas
// ============================================

export const CoachProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  bio: z.string().max(2000).optional(),
  expertise: z.array(z.string()).default([]),
  availability: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
});

export const CreateCoachProfileSchema = CoachProfileSchema.omit({
  id: true,
  userId: true,
  rating: true,
  reviewCount: true,
});

// ============================================
// Utility Schemas
// ============================================

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// Export all schemas for reuse
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Simulation = z.infer<typeof SimulationSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type CoachProfile = z.infer<typeof CoachProfileSchema>;