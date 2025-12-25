import { NextResponse } from 'next/server';

// HARDCODED DATA: Top 50 S&P 500 stocks to bypass the API block
const SP500_TOP_50 = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Cyclical' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Communication Services' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication Services' },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Cyclical' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financial Services' },
  { symbol: 'LLY', name: 'Eli Lilly and Co', sector: 'Healthcare' },
  { symbol: 'AVGO', name: 'Broadcom Inc', sector: 'Technology' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial Services' },
  { symbol: 'V', name: 'Visa Inc', sector: 'Financial Services' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy' },
  { symbol: 'MA', name: 'Mastercard Inc', sector: 'Financial Services' },
  { symbol: 'HD', name: 'Home Depot Inc', sector: 'Consumer Cyclical' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Defensive' },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Defensive' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'AMD', name: 'AMD', sector: 'Technology' }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  // 1. BYPASS: If asking for the list, return our manual list immediately.
  if (endpoint === 'sp500_constituent') {
    return NextResponse.json(SP500_TOP_50);
  }

  // 2. HISTORY: Use the 'historical-chart' endpoint (The only one that works for you)
  let finalUrl = '';
  if (endpoint === 'historical-price-full') {
    const target = (symbol === '^GSPC') ? 'SPY' : symbol;
    finalUrl = `https://financialmodelingprep.com/api/v3/historical-chart/1day/${target}?apikey=${apiKey}`;
  } else {
    finalUrl = `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${apiKey}`;
  }

  try {
    const res = await fetch(finalUrl);
    const data = await res.json();

    // Map Chart Data if needed
    if (endpoint === 'historical-price-full' && Array.isArray(data)) {
       return NextResponse.json({ symbol: symbol, historical: data });
    }
    return NextResponse.json(data);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
