import { NextResponse } from 'next/server';

// 1. HARDCODED LIST (Safe Data)
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
  // TRIM INPUTS to prevent "hidden space" bugs
  const endpoint = (searchParams.get('endpoint') || '').trim();
  const symbol = (searchParams.get('symbol') || '').trim();
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  let finalUrl = '';

  // --- STRICT MODE ROUTING ---

  // Case 1: The List (Serve Hardcoded Data)
  if (endpoint === 'sp500_constituent') {
    return NextResponse.json(SP500_TOP_50);
  }

  // Case 2: History (Force 'Historical Chart' Endpoint)
  else if (endpoint === 'historical-price-full') {
    const target = (symbol === '^GSPC') ? 'SPY' : symbol;
    // FORCE the safe V3 Chart endpoint. Never use 'price-full'.
    finalUrl = `https://financialmodelingprep.com/api/v3/historical-chart/1day/${target}?apikey=${apiKey}`;
  }

  // Case 3: Block Everything Else (No Passthrough)
  else {
    return NextResponse.json({
        error: 'Blocked Unsafe Endpoint',
        debug_endpoint: endpoint // See exactly what the server received
    }, { status: 400 });
  }

  try {
    const res = await fetch(finalUrl);
    const data = await res.json();

    // Check if FMP sent a "Fake 200" error
    if (data['Error Message']) {
        return NextResponse.json({ error: 'FMP Upstream Error', details: data }, { status: 403 });
    }

    // Map Chart Data if needed
    if (endpoint === 'historical-price-full' && Array.isArray(data)) {
       return NextResponse.json({ symbol: symbol, historical: data });
    }
    return NextResponse.json(data);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
