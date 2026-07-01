export const ExchangeRateService = {
  fetchRates: async (base: string = 'USD') => {
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
      const data = await response.json();
      return data.rates;
    } catch (e) {
      console.error('Failed to fetch exchange rates:', e);
      return null;
    }
  },

  convert: (amount: number, fromRate: number, toRate: number) => {
    return (amount / fromRate) * toRate;
  }
};
