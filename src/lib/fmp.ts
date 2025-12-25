const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export interface FMPConstituent {
  symbol: string;
  name: string;
  sector: string;
}

export interface FMPHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  unadjustedVolume: number;
  change: number;
  changePercent: number;
  vwap: number;
  label: string;
  changeOverTime: number;
}

export interface FMPHistoricalResponse {
  symbol: string;
  historical: FMPHistoricalPrice[];
}

export async function getSP500Constituents(): Promise<FMPConstituent[]> {
  const response = await fetch('/api/market-breadth?endpoint=sp500_constituent');
  if (!response.ok) throw new Error('Failed to fetch constituents');
  return response.json();
}

export async function getHistoricalPrices(symbol: string, from?: string): Promise<FMPHistoricalResponse> {
  // Fetching slightly more than 1 year to ensure we have enough data for EMA calculation convergence
  // 1 year = 365 days. Let's fetch 450 days or use "from" date.
  let url = `/api/market-breadth?endpoint=historical-price-full&symbol=${symbol}`;
  if (from) {
      url += `&from=${from}`;
  } else {
      // Default to slightly more than 1 year ago to handle EMA warmup
      const date = new Date();
      date.setDate(date.getDate() - 400); 
      const fromDate = date.toISOString().split('T')[0];
      url += `&from=${fromDate}`;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) return { symbol, historical: [] }; // Handle error gracefully
    const data = await response.json();
    return data;
  } catch (e) {
    console.error(`Error fetching ${symbol}`, e);
    return { symbol, historical: [] };
  }
}

export function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray = new Array(prices.length).fill(0);
  
  if (prices.length === 0) return [];

  // Initialize with the first price (or SMA of first period if we had it, but simplified here)
  emaArray[0] = prices[0];

  for (let i = 1; i < prices.length; i++) {
    emaArray[i] = (prices[i] * k) + (emaArray[i - 1] * (1 - k));
  }

  return emaArray;
}

export async function fetchSP500Index() {
    // S&P 500 symbol in FMP is usually ^GSPC.
    return getHistoricalPrices('^GSPC');
}

export async function processBreadth(
  onProgress: (count: number, total: number) => void
) {
  const constituents = await getSP500Constituents();
  const symbols = constituents.map((c) => c.symbol);
  
  // Prepare date range for history
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  // Fetch extra data for EMA warmup
  const fetchFromDate = new Date(oneYearAgo);
  fetchFromDate.setDate(fetchFromDate.getDate() - 50); // +50 days buffer
  const fromStr = fetchFromDate.toISOString().split('T')[0];

  const allHistories: Record<string, FMPHistoricalPrice[]> = {};
  
  // Batch processing
  const BATCH_SIZE = 10;
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const promises = batch.map((sym) => getHistoricalPrices(sym, fromStr));
    
    const results = await Promise.all(promises);
    
    results.forEach((res) => {
        if (res && res.historical) {
            // FMP returns historical data in descending order (newest first). 
            // We need ascending for EMA calculation.
            allHistories[res.symbol] = [...res.historical].reverse();
        }
    });

    onProgress(Math.min(i + BATCH_SIZE, symbols.length), symbols.length);
  }

  // Calculate Breadth
  // We need a map of Date -> count of stocks > EMA20
  const breadthMap: Record<string, { above: number; total: number }> = {};
  
  // Collect all unique dates from all histories to ensure alignment
  const allDates = new Set<string>();

  Object.values(allHistories).forEach((history) => {
      if (!history || history.length === 0) return;

      const closes = history.map((h) => h.close);
      const ema20 = calculateEMA(closes, 20);

      history.forEach((day, idx) => {
          const date = day.date;
          allDates.add(date);
          
          if (!breadthMap[date]) breadthMap[date] = { above: 0, total: 0 };
          
          if (closes[idx] > ema20[idx]) {
              breadthMap[date].above++;
          }
          breadthMap[date].total++;
      });
  });

  // Convert to array and filter for the requested 1 year window
  const finalBreadth = Object.entries(breadthMap)
      .map(([date, data]) => ({
          date,
          value: (data.above / 500) * 100 
      }))
      .filter(d => d.date >= oneYearAgo.toISOString().split('T')[0])
      .sort((a, b) => a.date.localeCompare(b.date));

  return finalBreadth;
}
