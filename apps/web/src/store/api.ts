import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type {
  Booking, BookingStatus, ChatMessage, ChatSession, Consultant, ConsultantProfileInput, DashboardResponse, HealthResponse,
  LoginInput, Paginated, RegisterInput, ResetPasswordInput, Resume, ResumeData, ResumeTemplateId, ResumeVersion,
  UpdateProfileInput, User, CreateBookingInput,
} from '@careerpilot/shared';

const rawBaseQuery = fetchBaseQuery({ baseUrl: '/api', credentials: 'include' });
let refreshing: Promise<boolean> | null = null;

// On 401, try one refresh-token rotation (shared across parallel requests), then retry the request.
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status === 401 && !url.startsWith('/auth/')) {
    refreshing ??= Promise.resolve(rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extra))
      .then((r) => !r.error)
      .finally(() => setTimeout(() => (refreshing = null), 0));
    if (await refreshing) result = await rawBaseQuery(args, api, extra);
  }
  return result;
};

export interface BookingQuery {
  page: number;
  limit: number;
  status?: BookingStatus | '';
  search?: string;
  sort?: string;
}
export interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

// Single API abstraction: every request goes to the gateway via same-origin /api with cookies.
export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Dashboard', 'Sessions', 'Session', 'Resumes', 'Resume', 'Versions', 'Bookings', 'Consultant', 'Users'],
  endpoints: (b) => ({
    me: b.query<{ user: User }, void>({ query: () => '/auth/me', providesTags: ['Me'] }),
    login: b.mutation<{ user: User }, LoginInput>({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
    register: b.mutation<{ user: User; devVerifyUrl?: string }, RegisterInput>({ query: (body) => ({ url: '/auth/register', method: 'POST', body }) }),
    logout: b.mutation<{ ok: boolean }, void>({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    refresh: b.mutation<{ user: User }, void>({ query: () => ({ url: '/auth/refresh', method: 'POST' }) }),
    forgotPassword: b.mutation<{ message: string; devResetUrl?: string }, { email: string }>({ query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }) }),
    resetPassword: b.mutation<{ ok: boolean }, ResetPasswordInput>({ query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }) }),
    verifyEmail: b.mutation<{ ok: boolean }, { token: string }>({ query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }), invalidatesTags: ['Me'] }),
    resendVerification: b.mutation<{ devVerifyUrl?: string; alreadyVerified?: boolean }, void>({ query: () => ({ url: '/auth/resend-verification', method: 'POST' }) }),
    updateProfile: b.mutation<{ user: User }, UpdateProfileInput>({ query: (body) => ({ url: '/users/me', method: 'PATCH', body }), invalidatesTags: ['Me'] }),
    users: b.query<Paginated<User>, { page: number; search?: string; role?: string }>({ query: (params) => ({ url: '/users', params: { limit: 10, ...params } }), providesTags: ['Users'] }),

    dashboard: b.query<DashboardResponse, void>({ query: () => '/dashboard', providesTags: ['Dashboard'] }),
    health: b.query<HealthResponse, void>({ query: () => '/health' }),

    sessions: b.query<{ items: ChatSession[] }, void>({ query: () => '/chat/sessions', providesTags: ['Sessions'] }),
    session: b.query<{ session: ChatSession; messages: ChatMessage[] }, string>({ query: (id) => `/chat/sessions/${id}`, providesTags: (r, e, id) => [{ type: 'Session', id }] }),
    createSession: b.mutation<{ session: ChatSession }, { title?: string }>({ query: (body) => ({ url: '/chat/sessions', method: 'POST', body }), invalidatesTags: ['Sessions', 'Dashboard'] }),
    renameSession: b.mutation<{ session: ChatSession }, { id: string; title: string }>({ query: ({ id, title }) => ({ url: `/chat/sessions/${id}`, method: 'PATCH', body: { title } }), invalidatesTags: (r, e, { id }) => ['Sessions', { type: 'Session', id }] }),
    deleteSession: b.mutation<void, string>({ query: (id) => ({ url: `/chat/sessions/${id}`, method: 'DELETE' }), invalidatesTags: ['Sessions', 'Dashboard'] }),

    resumes: b.query<{ items: Omit<Resume, 'data'>[] }, void>({ query: () => '/resumes', providesTags: ['Resumes'] }),
    resume: b.query<{ resume: Resume }, string>({ query: (id) => `/resumes/${id}`, providesTags: (r, e, id) => [{ type: 'Resume', id }] }),
    createResume: b.mutation<{ resume: Resume }, { title: string; templateId: ResumeTemplateId; data: ResumeData }>({ query: (body) => ({ url: '/resumes', method: 'POST', body }), invalidatesTags: ['Resumes', 'Dashboard'] }),
    updateResume: b.mutation<{ resume: Resume }, { id: string; title?: string; templateId?: ResumeTemplateId; data?: ResumeData }>({ query: ({ id, ...body }) => ({ url: `/resumes/${id}`, method: 'PATCH', body }), invalidatesTags: ['Resumes'] }),
    deleteResume: b.mutation<void, string>({ query: (id) => ({ url: `/resumes/${id}`, method: 'DELETE' }), invalidatesTags: ['Resumes', 'Dashboard'] }),
    duplicateResume: b.mutation<{ resume: Resume }, string>({ query: (id) => ({ url: `/resumes/${id}/duplicate`, method: 'POST' }), invalidatesTags: ['Resumes', 'Dashboard'] }),
    versions: b.query<{ items: ResumeVersion[] }, string>({ query: (id) => `/resumes/${id}/versions`, providesTags: ['Versions'] }),
    saveVersion: b.mutation<{ resume: Resume }, { id: string; note?: string }>({ query: ({ id, note }) => ({ url: `/resumes/${id}/versions`, method: 'POST', body: { note } }), invalidatesTags: ['Versions'] }),
    restoreVersion: b.mutation<{ resume: Resume }, { id: string; version: number }>({ query: ({ id, version }) => ({ url: `/resumes/${id}/versions/${version}/restore`, method: 'POST' }), invalidatesTags: (r, e, { id }) => ['Versions', { type: 'Resume', id }] }),
    generateResume: b.mutation<{ data: ResumeData; mock: boolean }, { target: 'summary' | 'experience' | 'full'; targetRole?: string; data: ResumeData }>({ query: (body) => ({ url: '/resumes/ai/generate', method: 'POST', body }) }),
    renderResume: b.query<string, { id?: string; template: ResumeTemplateId }>({
      query: ({ id, template }) => ({ url: id ? `/resumes/${id}/render` : '/resumes/templates/sample', params: { template }, responseHandler: 'text' }),
      keepUnusedDataFor: 5,
    }),

    consultants: b.query<{ items: Consultant[] }, string | void>({ query: (search) => ({ url: '/consultants', params: search ? { search } : {} }) }),
    slots: b.query<{ slots: Slot[] }, { id: string; date: string }>({ query: ({ id, date }) => ({ url: `/consultants/${id}/slots`, params: { date } }), keepUnusedDataFor: 0 }),
    myConsultant: b.query<{ consultant: Consultant | null }, void>({ query: () => '/consultants/me', providesTags: ['Consultant'] }),
    saveConsultant: b.mutation<{ consultant: Consultant }, ConsultantProfileInput>({ query: (body) => ({ url: '/consultants/me', method: 'PUT', body }), invalidatesTags: ['Consultant'] }),
    bookings: b.query<Paginated<Booking>, BookingQuery>({
      query: (params) => ({ url: '/bookings', params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)) }),
      providesTags: ['Bookings'],
    }),
    booking: b.query<{ booking: Booking }, string>({ query: (id) => `/bookings/${id}` }),
    createBooking: b.mutation<{ booking: Booking }, CreateBookingInput>({ query: (body) => ({ url: '/bookings', method: 'POST', body }), invalidatesTags: ['Bookings'] }),
    checkout: b.mutation<{ url: string; provider: string }, { id: string; originUrl: string }>({ query: ({ id, originUrl }) => ({ url: `/bookings/${id}/checkout`, method: 'POST', body: { originUrl } }) }),
    mockPay: b.mutation<{ booking: Booking }, { id: string; outcome: 'success' | 'failure' }>({ query: ({ id, outcome }) => ({ url: `/payments/mock/${id}/complete`, method: 'POST', body: { outcome } }), invalidatesTags: ['Bookings', 'Dashboard'] }),
    cancelBooking: b.mutation<{ booking: Booking }, string>({ query: (id) => ({ url: `/bookings/${id}/cancel`, method: 'PATCH' }), invalidatesTags: ['Bookings', 'Dashboard'] }),
    completeBooking: b.mutation<{ booking: Booking }, string>({ query: (id) => ({ url: `/bookings/${id}/complete`, method: 'PATCH' }), invalidatesTags: ['Bookings'] }),
  }),
});

export const {
  useMeQuery, useLoginMutation, useRegisterMutation, useLogoutMutation, useRefreshMutation, useForgotPasswordMutation,
  useResetPasswordMutation, useVerifyEmailMutation, useResendVerificationMutation, useUpdateProfileMutation, useUsersQuery,
  useDashboardQuery, useHealthQuery, useSessionsQuery, useSessionQuery, useCreateSessionMutation, useRenameSessionMutation,
  useDeleteSessionMutation, useResumesQuery, useResumeQuery, useCreateResumeMutation, useUpdateResumeMutation,
  useDeleteResumeMutation, useDuplicateResumeMutation, useVersionsQuery, useSaveVersionMutation, useRestoreVersionMutation,
  useGenerateResumeMutation, useRenderResumeQuery, useConsultantsQuery, useSlotsQuery, useMyConsultantQuery,
  useSaveConsultantMutation, useBookingsQuery, useBookingQuery, useCreateBookingMutation, useCheckoutMutation,
  useMockPayMutation, useCancelBookingMutation, useCompleteBookingMutation,
} = api;

// Extract the user-facing message from the gateway/service error envelope.
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  const e = err as { status?: number | string; data?: { error?: { message?: string } } };
  if (e?.data?.error?.message) return e.data.error.message;
  if (e?.status === 'FETCH_ERROR') return 'Cannot reach the server. Check your connection.';
  return fallback;
}
