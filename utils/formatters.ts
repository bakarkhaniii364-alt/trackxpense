export const getDateTime = (dateStr: string) => {
  const now = new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
  return date.toISOString();
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
