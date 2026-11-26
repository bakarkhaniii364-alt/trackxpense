export const getDateTime = (dateStr: string) => {
  const now = new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
  return date.toISOString();
};

/**
 * Ensures any logged transaction timestamp preserves the user's current local time
 * rather than defaulting to UTC midnight (YYYY-MM-DD -> 00:00Z).
 */
export const resolveTransactionTimestamp = (dateInput?: string | null): string => {
  const now = new Date();
  if (!dateInput) return now.toISOString();
  const trimmed = dateInput.trim();
  if (!trimmed) return now.toISOString();
  if (trimmed.includes('T')) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (trimmed === todayLocal) return now.toISOString();
    return getDateTime(trimmed);
  }
  return now.toISOString();
};

export const formatMoney = (amount: number, symbol: string) => {
    try {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: symbol || 'BDT',
        minimumFractionDigits: 0 
      }).format(amount);
    } catch (e) {
      // Fallback if currency symbol is not a valid ISO code
      const symbols: Record<string, string> = {
        'BDT': '৳',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹',
        'JPY': '¥'
      };
      const displaySymbol = symbols[symbol] || symbol || '৳';
      return `${displaySymbol}${amount.toLocaleString('en-US')}`;
    }
};
