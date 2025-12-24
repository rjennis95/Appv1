import { fetchSP500Constituents, fetchHistoricalPrice } from './api';
import { getMarketBreadth, getLastBreadthDate, saveMarketBreadth, saveStockState, getStockState, getAllStockStates } from './db';
import { format, parseISO, isAfter } from 'date-fns';

interface StockState {
  symbol: string;
  lastEma: number;
  date: string;
}

export const crunchData = async (onProgress: (percent: number, message: string) => void) => {
  const existingData = await getMarketBreadth();
  const lastDate = await getLastBreadthDate();

  // If we have data, check if we need to update
  if (lastDate) {
    // Check if lastDate is today (in NY time, ideally). FMP dates are YYYY-MM-DD.
    // We'll just compare against local date for simplicity or fetch ^GSPC latest date first?
    // Let's assume if it's not today, we try to update.
    const today = format(new Date(), 'yyyy-MM-dd');
    if (lastDate === today) {
       onProgress(100, 'Data is up to date.');
       return existingData;
    }
    // Update
    onProgress(0, 'Checking for updates...');
    return updateBreadth(lastDate, onProgress);
  }

  // Full crunch
  return fullCrunch(onProgress);
};

const calculateEMA = (prices: number[], period: number = 20, initialEma?: number): number[] => {
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let ema = initialEma !== undefined ? initialEma : prices[0];

  // If no initial EMA, we start with the first price (or SMA of first N).
  // Standard EMA usually starts with SMA of first N prices.
  // If we just have prices, we can assume the first price is the seed if history is long enough.
  // We fetched 400 days, so first few days being inaccurate is fine as they are not shown.

  if (initialEma === undefined) {
      // Simple initialization: use first price
      ema = prices[0];
      emas.push(ema);
      for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
        emas.push(ema);
      }
  } else {
      // Continue from previous EMA
      for (let i = 0; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
        emas.push(ema);
      }
  }
  return emas;
};

const chunk = <T>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

const fullCrunch = async (onProgress: (percent: number, message: string) => void) => {
  onProgress(1, 'Fetching S&P 500 list...');
  const constituents = await fetchSP500Constituents();
  if (!Array.isArray(constituents)) {
    throw new Error('Failed to fetch constituents: ' + JSON.stringify(constituents));
  }
  const stocks = constituents.map((c: any) => c.symbol);
  
  // Initialize breadth map: date -> count
  const breadthMap: Record<string, { total: number, above: number }> = {};
  const stockStates: StockState[] = [];

  const batches = chunk(stocks, 10);
  let processed = 0;

  for (const batch of batches) {
    const promises = batch.map(async (symbol) => {
      try {
        const history = await fetchHistoricalPrice(symbol, 400); // 400 days
        if (!history || history.length < 50) return;

        // Sort by date ascending
        const sortedHistory = history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const prices = sortedHistory.map((h: any) => h.close);
        
        // Calculate EMA
        const emas = calculateEMA(prices, 20);

        // Populate breadth map
        // We only care about the last 252 days for display, but we calculate for all 400.
        // But we should only save breadth for dates where we have good data coverage.
        // However, since we process all stocks, we can just aggregate all valid dates.
        
        sortedHistory.forEach((day: any, index: number) => {
          const date = day.date;
          const price = day.close;
          const ema = emas[index];

          if (!breadthMap[date]) breadthMap[date] = { total: 0, above: 0 };
          breadthMap[date].total++;
          if (price > ema) breadthMap[date].above++;
          
          // Save state for the last day
          if (index === sortedHistory.length - 1) {
             stockStates.push({ symbol, lastEma: ema, date });
          }
        });

      } catch (e) {
        console.error(`Error processing ${symbol}`, e);
      }
    });

    await Promise.all(promises);
    processed += batch.length;
    const percent = Math.round((processed / stocks.length) * 100);
    onProgress(percent, `Analyzing S&P 500: ${percent}% complete`);
  }

  // Convert map to array
  const result = Object.keys(breadthMap).sort().map(date => ({
    date,
    percentageAbove: (breadthMap[date].above / breadthMap[date].total) * 100
  }));

  // Filter for last 1.5 years or just all (the chart will slice)
  // Let's keep all for now.

  await saveMarketBreadth(result);
  await saveStockState(stockStates);
  
  return result;
};

const updateBreadth = async (lastDbDate: string, onProgress: (percent: number, message: string) => void) => {
  onProgress(5, 'Updating market breadth...');
  const constituents = await fetchSP500Constituents();
  if (!Array.isArray(constituents)) {
    throw new Error('Failed to fetch constituents: ' + JSON.stringify(constituents));
  }
  const stocks = constituents.map((c: any) => c.symbol);
  
  const allStates = await getAllStockStates();
  const stateMap = new Map(allStates.map((s: any) => [s.symbol, s]));

  const breadthMap: Record<string, { total: number, above: number }> = {};
  const newStockStates: StockState[] = [];

  const batches = chunk(stocks, 10);
  let processed = 0;

  for (const batch of batches) {
    const promises = batch.map(async (symbol) => {
      try {
        // Fetch only latest small amount of data
        // We need data strictly AFTER lastDbDate
        // But for EMA we need continuity.
        // Ideally we fetch from lastDbDate.
        
        const history = await fetchHistoricalPrice(symbol, 5); // Fetch last 5 days just in case
        if (!history || history.length === 0) return;

        // Sort ascending
        const sortedHistory = history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Find where to start
        const state = stateMap.get(symbol);
        
        // If no state, we can't update properly without full fetch, but let's skip or try to recover?
        // We'll skip for now to keep it simple.
        if (!state) return;

        // Filter for new days
        const newDays = sortedHistory.filter((h: any) => isAfter(parseISO(h.date), parseISO(state.date)));
        
        if (newDays.length === 0) {
            newStockStates.push(state); // Keep old state
            return; 
        }

        const prices = newDays.map((h: any) => h.close);
        const emas = calculateEMA(prices, 20, state.lastEma);

        newDays.forEach((day: any, index: number) => {
          const date = day.date;
          const price = day.close;
          const ema = emas[index];

          if (!breadthMap[date]) breadthMap[date] = { total: 0, above: 0 };
          breadthMap[date].total++;
          if (price > ema) breadthMap[date].above++;

          if (index === newDays.length - 1) {
             newStockStates.push({ symbol, lastEma: ema, date });
          }
        });

      } catch (e) {
        console.error(`Error updating ${symbol}`, e);
      }
    });
    
    await Promise.all(promises);
    processed += batch.length;
    onProgress(Math.round((processed / stocks.length) * 100), 'Updating...');
  }
  
  // Aggregate new breadth
  const newBreadth = Object.keys(breadthMap).sort().map(date => ({
    date,
    percentageAbove: (breadthMap[date].above / breadthMap[date].total) * 100
  }));

  // Merge with existing
  const existing = await getMarketBreadth();
  // Filter duplicates just in case
  const merged = [...existing.filter(e => !breadthMap[e.date]), ...newBreadth].sort((a, b) => a.date.localeCompare(b.date));

  await saveMarketBreadth(merged);
  await saveStockState(newStockStates);

  return merged;
};
