import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  // 1. Determine the Correct URL (Declared ONLY ONCE to fix build error)
  let finalUrl = '';

  // Case A: The "Banned" Legacy Constituent Endpoint -> Swap to SPY ETF Holdings
  if (endpoint === 'sp500_constituent') {
    finalUrl = `https://financialmodelingprep.com/api/v3/etf-holder/SPY?apikey=${apiKey}`;
  } 
  // Case B: Historical Price for S&P 500 Index (^GSPC) -> Swap to SPY ETF History
  // (Indices like ^GSPC are often restricted; SPY is not)
  else if (endpoint === 'historical-price-full' && symbol === '^GSPC') {
     const fromDate = searchParams.get('from');
     const dateQuery = fromDate ? `&from=${fromDate}` : '';
     finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/SPY?apikey=${apiKey}${dateQuery}`;
  }
  // Case C: Normal Historical Price (for other stocks)
  else if (endpoint === 'historical-price-full' && symbol) {
     const fromDate = searchParams.get('from');
     const dateQuery = fromDate ? `&from=${fromDate}` : '';
     finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}${dateQuery}`;
  }
  // Case D: Default/Fallback for any other endpoint
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

    // 2. Map Data if we used the SPY workaround (Case A)
    // The ETF endpoint uses 'asset' instead of 'symbol', so we fix it here.
    if (endpoint === 'sp500_constituent') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = data.map((item: any) => ({
        ...item,
        symbol: item.asset, // Map 'asset' -> 'symbol'
        name: item.name || item.asset,
        sector: item.sector || 'Unknown'
      }));
    }
    // 3. Map Data if we used the SPY History workaround (Case B)
    // If the frontend asked for ^GSPC but we fetched SPY, we just return the SPY data.
    // The structure is usually compatible ({ symbol: 'SPY', historical: [...] })

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
