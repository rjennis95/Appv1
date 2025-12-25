import { NextResponse } from 'next/server';

// 1. HARDCODED LIST (Top 50 S&P 500 Stocks by Weight)
// Since FMP blocks the list API, we provide the data manually.
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
  { symbol: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare' },
  { symbol: 'AMD', name: 'Adv. Micro Devices', sector: 'Technology' },
  { symbol: 'MRK', name: 'Merck & Co', sector: 'Healthcare' },
  { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Communication Services' },
  { symbol: 'CRM', name: 'Salesforce Inc', sector: 'Technology' },
  { symbol: 'WMT', name: 'Walmart Inc', sector: 'Consumer Defensive' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Financial Services' },
  { symbol: 'CVX', name: 'Chevron Corp', sector: 'Energy' },
  { symbol: 'KO', name: 'Coca-Cola Co', sector: 'Consumer Defensive' },
  { symbol: 'PEP', name: 'PepsiCo Inc', sector: 'Consumer Defensive' },
  { symbol: 'TMO', name: 'Thermo Fisher', sector: 'Healthcare' },
  { symbol: 'LIN', name: 'Linde plc', sector: 'Basic Materials' },
  { symbol: 'ACN', name: 'Accenture plc', sector: 'Technology' },
  { symbol: "MCD", name: "McDonald's Corp", sector: 'Consumer Cyclical' },
  { symbol: 'DIS', name: 'Walt Disney Co', sector: 'Communication Services' },
  { symbol: 'CSCO', name: 'Cisco Systems', sector: 'Technology' },
  { symbol: 'ABT', name: 'Abbott Labs', sector: 'Healthcare' },
  { symbol: 'QCOM', name: 'Qualcomm Inc', sector: 'Technology' },
  { symbol: 'INTU', name: 'Intuit Inc', sector: 'Technology' },
  { symbol: 'ORCL', name: 'Oracle Corp', sector: 'Technology' },
  { symbol: 'IBM', name: 'IBM', sector: 'Technology' },
  { symbol: 'VZ', name: 'Verizon', sector: 'Communication Services' },
  { symbol: 'CMCSA', name: 'Comcast Corp', sector: 'Communication Services' },
  { symbol: 'AMGN', name: 'Amgen Inc', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare' },
  { symbol: 'TXN', name: 'Texas Instruments', sector: 'Technology' },
  { symbol: 'NKE', name: 'Nike Inc', sector: 'Consumer Cyclical' },
  { symbol: 'DHR', name: 'Danaher Corp', sector: 'Healthcare' },
  { symbol: 'SPGI', name: 'S&P Global Inc', sector: 'Financial Services' },
  { symbol: 'CAT', name: 'Caterpillar Inc', sector: 'Industrials' },
  { symbol: 'RTX', name: 'RTX Corp', sector: 'Industrials' }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  // 2. INTERCEPT: Return Hardcoded List immediately (No API Call)
  if (endpoint === 'sp500_constituent') {
    return NextResponse.json(SP500_TOP_50);
  }

  let finalUrl = '';

  // 3. FIX HISTORY: Use 'historical-chart' (The only safe endpoint left)
  if (endpoint === 'historical-price-full') {
    // Always use SPY for the Index (^GSPC) to prevent blocks
    const targetSymbol = (symbol === '^GSPC') ? 'SPY' : symbol;
    // Use 1day chart which is standard on all plans
    finalUrl = `https://financialmodelingprep.com/api/v3/historical-chart/1day/${targetSymbol}?apikey=${apiKey}`;
  } else {
    finalUrl = `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${apiKey}`;
  }

  try {
    const res = await fetch(finalUrl);
    
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `FMP Error: ${res.status} ${errorText}` }, { status: res.status });
    }

    const data = await res.json();

    // 4. ADAPTER: Map Chart Data to Expected Format
    if (endpoint === 'historical-price-full') {
        if (Array.isArray(data)) {
            // Map 'date' -> 'date', 'close' -> 'close' (Already correct in chart endpoint)
            // Wrap it so frontend thinks it's the full object
            return NextResponse.json({
                symbol: symbol,
                historical: data
            });
        }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
