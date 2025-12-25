import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  let finalUrl = '';

  // 1. REAL FIX: Use the V4 'ETF Holdings' endpoint.
  // This is the modern, supported way to get the full S&P 500 list (via SPY).
  if (endpoint === 'sp500_constituent') {
    finalUrl = `https://financialmodelingprep.com/api/v4/etf-holdings?symbol=SPY&apikey=${apiKey}`;
  } 
  // 2. SAFE CHART: Use 'Historical Chart' (Modern Standard)
  else if (endpoint === 'historical-price-full') {
    // Always use SPY as the proxy for the index (^GSPC)
    const targetSymbol = (symbol === '^GSPC') ? 'SPY' : symbol;
    finalUrl = `https://financialmodelingprep.com/api/v3/historical-chart/1day/${targetSymbol}?apikey=${apiKey}`;
  } 
  // 3. Passthrough for everything else
  else {
    finalUrl = `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${apiKey}`;
  }

  try {
    const res = await fetch(finalUrl);
    
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `FMP Error: ${res.status} ${errorText}` }, { status: res.status });
    }

    let data = await res.json();

    // ADAPTER: V4 returns { symbol: 'SPY', holdings: [...] }
    // We need to extract the 'holdings' array and map it for the frontend.
    if (endpoint === 'sp500_constituent') {
      // V4 structure is different, we extract the array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const holdings = (data as any).holdings || data; 
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = holdings.map((item: any) => ({
        symbol: item.asset,    // V4 uses 'asset'
        name: item.name || item.asset,
        sector: item.sector || 'Unknown',
        weight: item.weightPercentage || 0
      }));
    }

    // Chart Adapter
    if (endpoint === 'historical-price-full' && Array.isArray(data)) {
         return NextResponse.json({ symbol: symbol, historical: data });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
