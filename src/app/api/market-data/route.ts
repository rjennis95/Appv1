import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint'); // Frontend sends 'sp500_constituent' or 'historical-price-full'
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  let finalUrl = '';

  // 1. THE LIST: Use the new 'Stable' S&P 500 endpoint
  // This returns the FULL list (approx 503 stocks), perfect for market breadth.
  if (endpoint === 'sp500_constituent') {
    finalUrl = `https://financialmodelingprep.com/stable/sp500-constituent?apikey=${apiKey}`;
  } 

  // 2. THE HISTORY: Use the new 'Stable' EOD endpoint
  // We intercept the old 'historical-price-full' request and swap it to the new URL.
  else if (endpoint === 'historical-price-full') {
     // Handle the index proxy if needed
     const target = (symbol === '^GSPC') ? 'SPY' : symbol;
     
     // New URL structure requires 'symbol' as a query param
     finalUrl = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${target}&apikey=${apiKey}`;
  }

  // 3. FALLBACK: For any other endpoints, try the standard V3 path
  else {
    finalUrl = `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${apiKey}`;
  }

  try {
    const res = await fetch(finalUrl);
    const data = await res.json();

    // SAFETY CHECK: FMP sometimes returns 200 OK with an error message in the body
    if (data['Error Message']) {
        throw new Error(data['Error Message']);
    }

    // --- DATA ADAPTERS ---
    // We map the new 'Stable' data format to match what our Frontend expects (Old V3 format)

    // Adapter 1: The List
    // Stable API returns array of { symbol, name, sector, ... }
    // Frontend expects this exact format, so we just pass it through or map to be safe.
    if (endpoint === 'sp500_constituent') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json(data.map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        sector: item.sector,
        weight: item.weightPercentage || 0
      })));
    }

    // Adapter 2: The History
    // Stable API returns an Array [ { date, close... } ]
    // Frontend expects an Object { symbol: "AAPL", historical: [...] }
    if (endpoint === 'historical-price-full') {
        if (Array.isArray(data)) {
            return NextResponse.json({
                symbol: symbol,
                historical: data
            });
        }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ 
        error: `FMP Error: ${error.message}`,
        debug_url: finalUrl.replace(apiKey || '', 'HIDDEN_KEY') // Help debug if it fails
    }, { status: 500 });
  }
}
