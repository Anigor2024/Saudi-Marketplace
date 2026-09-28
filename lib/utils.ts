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

/**
 * Extracts only the last 4 digits of an IBAN or fallback string (never exposes full IBAN).
 */
export function getIbanLast4(iban?: string, fallbackLast4?: string): string {
  if (fallbackLast4 && fallbackLast4.trim().length > 0) {
    return fallbackLast4.trim().slice(-4);
  }
  if (!iban || typeof iban !== 'string') {
    return '****';
  }
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return clean.slice(-4) || '****';
}

/**
 * Ensures a value is a finite number, protecting against NaN and Infinity.
 */
export function safeNumber(val: unknown, fallback = 0): number {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Divides two numbers safely, protecting against divide-by-zero, NaN, and Infinity.
 */
export function safeDivide(numerator: number, denominator: number, decimals = 2): number {
  const num = safeNumber(numerator, 0);
  const den = safeNumber(denominator, 0);
  if (den === 0) return 0;
  const result = num / den;
  if (!Number.isFinite(result)) return 0;
  return Number(result.toFixed(decimals));
}

/**
 * Extracts the 15% Saudi ZATCA VAT portion already included in a VAT-inclusive SAR amount:
 * VAT portion = VAT-inclusive amount * 15 / 115
 * Never adds VAT on top of a VAT-inclusive price.
 */
export function extractIncludedVat(vatInclusiveAmount: number): number {
  const amount = Math.max(0, safeNumber(vatInclusiveAmount, 0));
  return Number(((amount * 15) / 115).toFixed(2));
}

/**
 * Exports tabular data to a UTF-8 CSV file with BOM so Arabic/English renders cleanly in Excel.
 * Automatically masks any accidental IBAN patterns in cell values.
 */
export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  if (typeof window === 'undefined') return;

  const escapeCsvCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    if (typeof cell === 'number') {
      const cleanNum = Number.isFinite(cell) ? cell : 0;
      return `"${cleanNum}"`;
    }
    const sanitized = maskIbanInText(String(cell)).replace(/"/g, '""');
    return `"${sanitized}"`;
  };

  const csvLines = [
    headers.map((h) => escapeCsvCell(h)).join(','),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')),
  ];

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


