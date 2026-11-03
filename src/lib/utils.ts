import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format IDR BigInt amount into standard Indonesian currency string
 * e.g., 170000n -> "Rp170.000"
 */
export function formatIDR(amount: bigint | number): string {
  const value = typeof amount === "bigint" ? Number(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format net balance with sign and color intent
 * +Rp80.000 (Receivable)
 * -Rp80.000 (Payable)
 * Rp0 (Balanced)
 */
export function formatNetBalance(amount: bigint | number): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
} {
  const value = typeof amount === "bigint" ? amount : BigInt(Math.round(amount));
  const isPositive = value > 0n;
  const isNegative = value < 0n;
  const isZero = value === 0n;

  const absFormatted = formatIDR(value < 0n ? -value : value);
  const formatted = isPositive ? `+${absFormatted}` : isNegative ? `-${absFormatted}` : absFormatted;

  return { formatted, isPositive, isNegative, isZero };
}
