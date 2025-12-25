import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Trim whitespace to prevent "invisible character" bugs
  const endpoint = (searchParams.get('endpoint') || '').trim();
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });

  let finalUrl = '';
  let logicUsed = ''; // To track which path we took

  // 1. Intercept Constituents
  if (endpoint === 'sp500_constituent') {
    finalUrl = `https://financialmodelingprep.com/api/v3/etf-holder/SPY?apikey=${apiKey}`;
    logicUsed = 'Intercepted: Swapped to SPY ETF';
  } 
  // 2. Intercept Index History
  else if (endpoint === 'historical-price-full' && symbol === '^GSPC') {
     const fromDate = searchParams.get('from');
     const dateQuery = fromDate ? `&from=${fromDate}` : '';
     finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/SPY?apikey=${apiKey}${dateQuery}`;
     logicUsed = 'Intercepted: Swapped to SPY History';
  } 
  // 3. Passthrough
  else {
    // If it's a historical price request for a normal stock, we need to construct the path correctly.
    // The provided snippet does: finalUrl = .../api/v3/${endpoint}?apikey=...
    // AND THEN: if (...) finalUrl += dateQuery
    // BUT this fails to put the SYMBOL in the path for historical-price-full.
    
    // I will CORRECT this logic here because following the snippet literally will break 
    // ALL stock charts (Case 3 in previous logic).
    // The snippet provided has a flaw in the "Passthrough" else block logic for 'historical-price-full'.
    
    if (endpoint === 'historical-price-full' && symbol) {
        const fromDate = searchParams.get('from');
        const dateQuery = fromDate ? `&from=${fromDate}` : '';
        finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}${dateQuery}`;
    } else {
        // Generic fallback
        finalUrl = `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${apiKey}`;
    }
    
    logicUsed = 'Passthrough (No Interception)';
  }

  try {
    const res = await fetch(finalUrl);
    
    // IF ERROR: Return massive debug info
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ 
        ERROR_TYPE: 'FMP API Error',
        DEBUG_INFO: {
            received_endpoint: endpoint,
            logic_path_taken: logicUsed,
            attempted_url: finalUrl.replace(apiKey, 'HIDDEN_KEY'), // Hide key for safety
        },
        upstream_error: errorText
      }, { status: res.status });
    }

    let data = await res.json();

    // Mapping Fix
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
