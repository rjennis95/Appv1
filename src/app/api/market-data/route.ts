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
    finalUrl = `https://financialmodelingprep.com/api/v3/${endpoint}/${symbol ? symbol : ''}?apikey=${apiKey}`; 
    // Note: The previous code handled 'symbol' in the path for historical data differently.
    // The snippet provided by the user in the prompt constructs: `.../v3/${endpoint}?apikey...`
    // BUT then adds: `if (endpoint === 'historical-price-full' && symbol) { ... finalUrl += dateQuery }`
    // It assumes the initial `finalUrl` is correct.
    // However, `historical-price-full` needs the symbol in the path: `.../v3/historical-price-full/AAPL?apikey...`
    // If I strictly follow the snippet:
    // `finalUrl = https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${apiKey};`
    // This is WRONG for historical data.
    // BUT the snippet has an `if` block:
    // `if (endpoint === 'historical-price-full' && symbol) { ... finalUrl += dateQuery; }`
    // It appends dateQuery but doesn't fix the missing symbol in the path.
    
    // I MUST fix this or the passthrough will fail for normal stocks.
    // I will interpret "Passthrough" intelligently to construct the correct URL structure.
    
    if (endpoint === 'historical-price-full' && symbol) {
        const fromDate = searchParams.get('from');
        const dateQuery = fromDate ? `&from=${fromDate}` : '';
        finalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}${dateQuery}`;
    } else {
        // Generic fallback for endpoints without symbol in path or handled differently
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
