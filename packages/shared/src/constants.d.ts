export type Role = 'USER' | 'CONSULTANT' | 'ADMIN';
export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';
export type PaymentStatus = 'INITIATED' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
export type ResumeTemplateId = 'modern-professional' | 'ats-classic';

export declare const ROLES: { readonly USER: 'USER'; readonly CONSULTANT: 'CONSULTANT'; readonly ADMIN: 'ADMIN' };
export declare const SELF_REGISTER_ROLES: readonly ['USER', 'CONSULTANT'];
export declare const ROLE_HOME: Readonly<Record<Role, string>>;
export declare const BOOKING_STATUS: Readonly<Record<BookingStatus, BookingStatus>>;
export declare const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, BookingStatus[]>>;
export declare function canTransition(from: BookingStatus, to: BookingStatus): boolean;
export declare const PAYMENT_STATUS: Readonly<Record<PaymentStatus, PaymentStatus>>;
export declare const RESUME_TEMPLATES: {
  readonly MODERN_PROFESSIONAL: 'modern-professional';
  readonly ATS_CLASSIC: 'ats-classic';
};
export declare const COOKIE_NAMES: { readonly ACCESS: 'access_token'; readonly REFRESH: 'refresh_token' };
export declare const INTERNAL_TOKEN_HEADER: 'x-internal-token';
export declare const CURRENCY: 'INR';
