const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export const getApiKey = () => {
  return import.meta.env.VITE_FMP_API_KEY || ''; // Ensure you set this in .env.local
};

export const fetchSP500Constituents = async () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API Key missing');
  const response = await fetch(`${BASE_URL}/sp500_constituent?apikey=${apiKey}`);
  if (!response.ok) throw new Error('Failed to fetch S&P 500 constituents');
  return response.json();
};

export const fetchHistoricalPrice = async (symbol: string, days: number = 400) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API Key missing');
  // fetching more data to ensure EMA calculation is accurate for the last 252 days
  const response = await fetch(`${BASE_URL}/historical-price-full/${symbol}?timeseries=${days}&apikey=${apiKey}`);
  if (!response.ok) throw new Error(`Failed to fetch history for ${symbol}`);
  const data = await response.json();
  return data.historical || []; // FMP returns { symbol, historical: [...] }
};

export const fetchSP500Price = async (days: number = 400) => {
   return fetchHistoricalPrice('^GSPC', days);
};
