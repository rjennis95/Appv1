import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  // --- VERIFIED: Declared exactly ONCE ---
  let finalUrl = '';

  // 1. Intercept 'Constituents' -> Swap to SPY ETF
  if (endpoint === 'sp500_constituent') {
    finalUrl = `https://financialmodelingprep.com/api/v3/etf-holder/SPY?apikey=${apiKey}`;
  } 
  // 2. Intercept 'Index History' -> Swap to SPY History
  else if (endpoint === 'historical-price-full' && symbol === '^GSPC') {
     const fromDate = searchParams.get('from');
     const dateQuery = fromDate ? `&from=${fromDate}` : '';
     finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/SPY?apikey=${apiKey}${dateQuery}`;
  }
  // 3. Normal History
  else if (endpoint === 'historical-price-full' && symbol) {
     const fromDate = searchParams.get('from');
     const dateQuery = fromDate ? `&from=${fromDate}` : '';
     finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}${dateQuery}`;
  }
  // 4. Default Fallback
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

    // Mapping Fix (Asset -> Symbol)
    if (endpoint === 'sp500_constituent') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = data.map((item: any) => ({
        ...item,
        symbol: item.asset, 
        name: item.name || item.asset,
        sector: item.sector || 'Unknown'
      }));
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
