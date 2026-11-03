/**
 * Frontend-safe enum constants and types that can be imported
 * in both Client Components and Server Components without triggering Prisma browser bundle issues.
 */

export type Role = "ADMIN" | "MEMBER";
export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type TransactionStatus = "CONFIRMED" | "VOIDED";
export const TransactionStatus = {
  CONFIRMED: "CONFIRMED",
  VOIDED: "VOIDED",
} as const;

export type SplitType = "SHARED" | "PERSONAL" | "CUSTOM";
export const SplitType = {
  SHARED: "SHARED",
  PERSONAL: "PERSONAL",
  CUSTOM: "CUSTOM",
} as const;

export type SettlementStatus = "PENDING" | "CONFIRMED" | "REJECTED";
export const SettlementStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
} as const;

