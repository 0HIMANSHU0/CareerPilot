import type { z } from 'zod';
import type { Role, BookingStatus, ResumeTemplateId } from './constants';

export * from './constants';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'USER' | 'CONSULTANT';
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  profile?: { headline?: string; bio?: string; location?: string; linkedinUrl?: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  emailVerified?: boolean;
  profile?: { headline?: string; bio?: string; location?: string; linkedinUrl?: string };
  createdAt: string;
  updatedAt: string;
}

export interface ResumeData {
  personal: {
    fullName: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    links: { label: string; url: string }[];
  };
  summary: string;
  education: {
    institution: string;
    degree: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    grade?: string;
  }[];
  experience: {
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
    highlights: string[];
  }[];
  skills: string[];
  projects: { name: string; description?: string; url?: string; technologies: string[] }[];
  certifications: { name: string; issuer?: string; date?: string }[];
  achievements: string[];
}

export interface CreateBookingInput {
  consultantId: string;
  startTime: string;
  name: string;
  email: string;
  phone: string;
  agenda: string;
}

export type ServiceState = 'ok' | 'unavailable';

export interface DashboardResponse {
  stats: {
    totalResumes: number | null;
    totalChats: number | null;
    upcomingConsultations: number | null;
    completedConsultations: number | null;
  };
  services: Record<'ai' | 'booking', { status: ServiceState; message?: string }>;
  partial: boolean;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  gateway: 'ok';
  services: Record<'auth' | 'ai' | 'booking', { status: ServiceState; db?: string }>;
}

export declare const objectIdSchema: z.ZodType<string>;
export declare const registerSchema: z.ZodType<RegisterInput>;
export declare const loginSchema: z.ZodType<LoginInput>;
export declare const updateProfileSchema: z.ZodType<UpdateProfileInput>;
export declare const paginationQuerySchema: z.ZodType<{ page: number; limit: number; search?: string; sort?: string }>;
export declare const resumeDataSchema: z.ZodType<ResumeData>;
export declare const resumeTemplateIdSchema: z.ZodType<ResumeTemplateId>;
export declare const createBookingSchema: z.ZodType<CreateBookingInput>;
export declare const bookingListQuerySchema: z.ZodType<{
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  status?: BookingStatus;
}>;

export interface ChatSession {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'complete' | 'error';
  createdAt: string;
}
export interface Resume {
  id: string;
  title: string;
  templateId: ResumeTemplateId;
  data: ResumeData;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface ResumeVersion {
  id: string;
  version: number;
  title: string;
  templateId: ResumeTemplateId;
  note?: string;
  createdAt: string;
}
export interface AvailabilityWindow {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}
export interface ConsultantProfileInput {
  headline: string;
  bio: string;
  expertise: string[];
  hourlyRate: number;
  active: boolean;
  availability: AvailabilityWindow[];
}
export interface Consultant extends ConsultantProfileInput {
  id: string;
  userId: string;
  name: string;
  currency: 'INR';
}
export interface Booking {
  id: string;
  consultantId: string;
  consultantName: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  agenda: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  amount: number;
  currency: 'INR';
  payment: { provider?: 'stripe' | 'mock'; status?: string; paidAt?: string };
  calendar: { status: string; eventId?: string; meetingUrl?: string };
  notification: { status: string; sentAt?: string };
  createdAt: string;
}
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export type ResetPasswordInput = { token: string; password: string };
export declare const forgotPasswordSchema: z.ZodType<{ email: string }>;
export declare const resetPasswordSchema: z.ZodType<ResetPasswordInput>;
export declare const verifyEmailSchema: z.ZodType<{ token: string }>;
export declare const createChatSessionSchema: z.ZodType<{ title?: string }>;
export declare const renameChatSessionSchema: z.ZodType<{ title: string }>;
export declare const sendMessageSchema: z.ZodType<{ content: string }>;
export declare const createResumeSchema: z.ZodType<{ title: string; templateId: ResumeTemplateId; data: ResumeData }>;
export declare const updateResumeSchema: z.ZodType<{ title?: string; templateId?: ResumeTemplateId; data?: ResumeData }>;
export declare const generateResumeSchema: z.ZodType<{ target: 'summary' | 'experience' | 'full'; targetRole?: string; data: ResumeData }>;
export declare const consultantProfileSchema: z.ZodType<ConsultantProfileInput, z.ZodTypeDef, unknown>;
export declare const slotsQuerySchema: z.ZodType<{ date: string }>;
export declare const checkoutSchema: z.ZodType<{ originUrl: string }>;
