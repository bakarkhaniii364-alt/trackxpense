/**
 * Financial Input Validation & Sanitization Utility
 * Ensures non-negative numbers, bounds checking, NaN prevention, and 2-decimal rounding.
 */

export const MAX_SAFE_FINANCIAL_AMOUNT = 100_000_000; // 100M cap

export interface ValidationResult {
  isValid: boolean;
  sanitizedAmount: number;
  error?: string;
}

export const validateAmount = (
  rawAmount: any,
  maxLimit: number = MAX_SAFE_FINANCIAL_AMOUNT
): ValidationResult => {
  if (rawAmount === null || rawAmount === undefined || rawAmount === '') {
    return { isValid: false, sanitizedAmount: 0, error: 'Amount is required' };
  }

  const num = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/,/g, ''));

  if (isNaN(num)) {
    return { isValid: false, sanitizedAmount: 0, error: 'Invalid numeric value' };
  }

  if (num <= 0) {
    return { isValid: false, sanitizedAmount: 0, error: 'Amount must be greater than zero' };
  }

  if (num > maxLimit) {
    return { 
      isValid: false, 
      sanitizedAmount: maxLimit, 
      error: `Amount exceeds maximum limit (${maxLimit.toLocaleString()})` 
    };
  }

  // Round to 2 decimal places to eliminate floating point artifacts
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;

  return {
    isValid: true,
    sanitizedAmount: rounded
  };
};

export const sanitizeNote = (note: any, maxLength: number = 140): string => {
  if (typeof note !== 'string') return '';
  const noScript = note.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  const stripped = noScript.replace(/<[^>]*>?/gm, '').trim();
  return stripped.slice(0, maxLength);
};

export const validateDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};
