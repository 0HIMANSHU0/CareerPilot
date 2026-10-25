// Zod schemas used for validation on the backend and form validation on the frontend.
const { z } = require('zod');
const { SELF_REGISTER_ROLES, BOOKING_STATUS, RESUME_TEMPLATES } = require('./constants');

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number')
  .optional()
  .or(z.literal(''));

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  role: z.enum(SELF_REGISTER_ROLES),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: phoneSchema,
  profile: z
    .object({
      headline: z.string().trim().max(120).optional(),
      bio: z.string().trim().max(2000).optional(),
      location: z.string().trim().max(120).optional(),
      linkedinUrl: z.string().trim().url().optional().or(z.literal('')),
    })
    .optional(),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  sort: z.string().trim().max(50).optional(),
});

// Structured resume data (content only, no presentation).
const dateText = z.string().trim().max(30).optional().or(z.literal(''));
const resumeDataSchema = z.object({
  personal: z.object({
    fullName: z.string().trim().min(1).max(100),
    title: z.string().trim().max(120).optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional(),
    location: z.string().trim().max(120).optional(),
    links: z.array(z.object({ label: z.string().max(40), url: z.string().url() })).max(6).default([]),
  }),
  summary: z.string().max(5000).default(''),
  education: z
    .array(
      z.object({
        institution: z.string().max(150),
        degree: z.string().max(150),
        field: z.string().max(150).optional(),
        startDate: dateText,
        endDate: dateText,
        grade: z.string().max(50).optional(),
      }),
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().max(150),
        title: z.string().max(150),
        location: z.string().max(120).optional(),
        startDate: dateText,
        endDate: dateText,
        current: z.boolean().default(false),
        highlights: z.array(z.string().max(500)).max(15).default([]),
      }),
    )
    .default([]),
  skills: z.array(z.string().trim().max(60)).max(60).default([]),
  projects: z
    .array(
      z.object({
        name: z.string().max(150),
        description: z.string().max(1000).optional(),
        url: z.string().url().optional().or(z.literal('')),
        technologies: z.array(z.string().max(60)).default([]),
      }),
    )
    .default([]),
  certifications: z
    .array(z.object({ name: z.string().max(150), issuer: z.string().max(150).optional(), date: dateText }))
    .default([]),
  achievements: z.array(z.string().max(500)).max(20).default([]),
});

const resumeTemplateIdSchema = z.enum([RESUME_TEMPLATES.MODERN_PROFESSIONAL, RESUME_TEMPLATES.ATS_CLASSIC]);

const createBookingSchema = z.object({
  consultantId: objectIdSchema,
  startTime: z.string().datetime({ offset: true }),
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number'),
  agenda: z.string().trim().min(10, 'Tell the consultant a bit more').max(2000),
});

const bookingListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(Object.values(BOOKING_STATUS)).optional(),
});


const forgotPasswordSchema = z.object({ email: emailSchema });
const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

// Chat
const createChatSessionSchema = z.object({ title: z.string().trim().min(1).max(120).optional() });
const renameChatSessionSchema = z.object({ title: z.string().trim().min(1, 'Title is required').max(120) });
const sendMessageSchema = z.object({ content: z.string().trim().min(1, 'Message is empty').max(8000) });

// Resumes
const createResumeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  templateId: resumeTemplateIdSchema,
  data: resumeDataSchema,
});
const updateResumeSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  templateId: resumeTemplateIdSchema.optional(),
  data: resumeDataSchema.optional(),
});
const generateResumeSchema = z.object({
  target: z.enum(['summary', 'experience', 'full']),
  targetRole: z.string().trim().max(120).optional(),
  data: resumeDataSchema,
});

// Consultants (availability hours are UTC, 60-minute slots)
const consultantProfileSchema = z.object({
  headline: z.string().trim().min(3).max(140),
  bio: z.string().trim().max(2000).default(''),
  expertise: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  hourlyRate: z.coerce.number().int().min(100, 'Minimum rate is ₹100').max(100000),
  active: z.boolean().default(true),
  availability: z
    .array(
      z
        .object({
          dayOfWeek: z.number().int().min(0).max(6),
          startHour: z.number().int().min(0).max(23),
          endHour: z.number().int().min(1).max(24),
        })
        .refine((w) => w.endHour > w.startHour, 'End must be after start'),
    )
    .max(21),
});
const slotsQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD') });
const checkoutSchema = z.object({ originUrl: z.string().url() });

module.exports = {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  createChatSessionSchema,
  renameChatSessionSchema,
  sendMessageSchema,
  createResumeSchema,
  updateResumeSchema,
  generateResumeSchema,
  consultantProfileSchema,
  slotsQuerySchema,
  checkoutSchema,
  objectIdSchema,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  paginationQuerySchema,
  resumeDataSchema,
  resumeTemplateIdSchema,
  createBookingSchema,
  bookingListQuerySchema,
};
