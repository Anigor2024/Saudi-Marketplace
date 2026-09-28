import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Masks a Saudi or international IBAN for safe display outside profile editing forms.
 * Example: "SA4480000204608010167519" -> "SA44 **** **** **** **** 7519"
 */
export function maskIban(iban?: string): string {
  if (!iban || typeof iban !== 'string') {
    return 'SA** **** **** **** **** ****';
  }
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (clean.length <= 8) {
    const last4Short = clean.slice(-4) || '****';
    return `SA** **** **** **** **** ${last4Short}`;
  }
  const prefix = clean.slice(0, 4);
  const last4 = clean.slice(-4);
  return `${prefix} **** **** **** **** ${last4}`;
}

/**
 * Masks any raw Saudi IBAN sequences inside a free-form message or ticket string.
 */
export function maskIbanInText(text?: string): string {
  if (!text) return '';
  return text.replace(/\bSA[0-9A-Z]{10,26}\b/gi, (match) => maskIban(match));
}

