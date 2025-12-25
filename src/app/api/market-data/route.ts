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

  // 1. SAFE LIST: Use 'Stock Screener' instead of Banned 'Constituents'
  // We fetch the top 100 largest stocks to simulate the S&P 500 list securely.
  if (endpoint === 'sp500_constituent') {
    finalUrl = `https://financialmodelingprep.com/api/v3/stock-screener?marketCapMoreThan=50000000000&limit=100&apikey=${apiKey}`;
  } 
  // 2. SAFE CHART: Use 'Historical Chart' instead of Banned 'Price Full'
  else if (endpoint === 'historical-price-full') {
    // Always use SPY as the proxy for the index (^GSPC) to ensure data availability
    const targetSymbol = (symbol === '^GSPC') ? 'SPY' : symbol;
    finalUrl = `https://financialmodelingprep.com/api/v3/historical-chart/1day/${targetSymbol}?apikey=${apiKey}`;
  } 
  // 3. Fallback for other endpoints
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

    // ADAPTER 1: Map 'Screener' data to match 'Constituent' format
    if (endpoint === 'sp500_constituent') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = data.map((item: any) => ({
        symbol: item.symbol,
        name: item.companyName, // Screener uses 'companyName', Frontend needs 'name'
        sector: item.sector,
        marketCap: item.marketCap
      }));
    }

    // ADAPTER 2: Map 'Historical Chart' (Array) to 'Historical Price Full' (Object)
    // The frontend expects { symbol: "...", historical: [...] }
    if (endpoint === 'historical-price-full') {
        if (Array.isArray(data)) {
            return NextResponse.json({
                symbol: symbol,
                historical: data // The new endpoint returns the array directly
            });
        }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
