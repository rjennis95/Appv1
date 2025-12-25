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

  // 1. FIX: Use the NEW 'etf/holdings' endpoint (The old 'etf-holder' is Legacy)
  if (endpoint === 'sp500_constituent') {
    // Note: User snippet uses "etf/holdings?symbol=SPY"
    // I need to verify if this is v3 or v4. Usually v3 is standard.
    // The snippet says: https://financialmodelingprep.com/api/v3/etf/holdings?symbol=SPY
    // Wait, the prompt says "V4-compatible" but uses /api/v3 in the snippet.
    // I will stick to the snippet's URL structure exactly.
    finalUrl = `https://financialmodelingprep.com/api/v3/etf-holder/SPY?apikey=${apiKey}`;
    // WAIT. The prompt explicitly says: "Use the NEW 'etf/holdings' endpoint (The old 'etf-holder' is Legacy)"
    // BUT the snippet code I see in my thought process... wait.
    // The prompt snippet: finalUrl = https://financialmodelingprep.com/api/v3/etf/holdings?symbol=SPY&apikey=${apiKey};
    // Ah, my previous "etf-holder" was the legacy one.
    // The NEW one is indeed likely "etf-holder" -> "etf-holdings"? Or "etf/holdings"?
    // FMP docs say v3/etf-holder/{symbol}.
    // But maybe v4 is different?
    // The snippet uses: `https://financialmodelingprep.com/api/v3/etf/holdings?symbol=SPY...`
    // Wait, "etf/holdings" is usually `v4/etf-holdings?symbol=...`?
    // I will blindly follow the snippet URL: `api/v3/etf/holdings?symbol=SPY`.
    
    // Actually, looking closely at the snippet provided in the user message:
    // finalUrl = https://financialmodelingprep.com/api/v3/etf/holdings?symbol=SPY&apikey=${apiKey};
    
    finalUrl = `https://financialmodelingprep.com/api/v3/etf-holder/SPY?apikey=${apiKey}`; 
    // Wait, the user said "Replace ... with this V4-compatible version".
    // And in their code block they have:
    // finalUrl = https://financialmodelingprep.com/api/v3/etf/holdings?symbol=SPY&apikey=${apiKey};
    
    // I will use THAT URL.
    finalUrl = `https://financialmodelingprep.com/api/v3/etf/holdings?symbol=SPY&apikey=${apiKey}`;
  } 
  // 2. FIX: Use 'historical-chart' (The old 'historical-price-full' is Legacy for some plans)
  else if (endpoint === 'historical-price-full') {
    // Handle both ^GSPC and normal stocks by using the SPY proxy for the index if needed
    const targetSymbol = (symbol === '^GSPC') ? 'SPY' : symbol;
    // User snippet: https://financialmodelingprep.com/api/v3/historical-chart/1day/${targetSymbol}?apikey=${apiKey}
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

    // 4. ADAPTER: The new 'etf/holdings' endpoint returns slightly different keys.
    // We map them to 'symbol', 'name', 'sector' so the frontend stays happy.
    if (endpoint === 'sp500_constituent') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = data.map((item: any) => ({
        symbol: item.asset || item.symbol, // Handle both potential keys
        name: item.name || item.asset,
        sector: item.sector || 'Unknown',
        weight: item.weightPercentage || 0
      }));
    }

    // 5. ADAPTER: The 'historical-chart' endpoint returns a simple array.
    // The frontend might expect { historical: [...] } object if it was built for the old API.
    if (endpoint === 'historical-price-full') {
        // If the frontend expects { symbol: '...', historical: [...] }, we wrap it.
        if (Array.isArray(data)) {
            return NextResponse.json({ symbol: symbol, historical: data });
        }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
