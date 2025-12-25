import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  // FIXED: Declare variable ONCE to prevent 'Build Failed' error
  let finalUrl = '';

  // CASE 1: Workaround for Banned "Constituents" Endpoint
  // We fetch SPY ETF holdings instead, which is allowed.
  if (endpoint === 'sp500_constituent') {
    finalUrl = `https://financialmodelingprep.com/api/v3/etf-holder/SPY?apikey=${apiKey}`;
  } 
  // CASE 2: Workaround for Banned "S&P 500 Index History"
  // ^GSPC is often restricted. We fetch SPY history instead.
  else if (endpoint === 'historical-price-full' && symbol === '^GSPC') {
     const fromDate = searchParams.get('from');
     const dateQuery = fromDate ? `&from=${fromDate}` : '';
     finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/SPY?apikey=${apiKey}${dateQuery}`;
  }
  // CASE 3: Normal History Requests (e.g. NVDA, AAPL)
  else if (endpoint === 'historical-price-full' && symbol) {
     const fromDate = searchParams.get('from');
     const dateQuery = fromDate ? `&from=${fromDate}` : '';
     finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}${dateQuery}`;
  }
  // CASE 4: Default passthrough for everything else
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

    // MAPPING FIX: The SPY ETF endpoint uses 'asset' instead of 'symbol'.
    // We map it back so the frontend charts don't crash.
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
