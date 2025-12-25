import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
  }

  const BASE_URL = 'https://financialmodelingprep.com/api/v3';
  let url = '';

  if (endpoint === 'sp500_constituent') {
      // Use ETF holder endpoint for SPY as sp500_constituent is deprecated/restricted
      url = `${BASE_URL}/etf-holder/SPY?apikey=${apiKey}`;
  } else if (endpoint === 'historical-price-full' && symbol) {
      url = `${BASE_URL}/historical-price-full/${symbol}?apikey=${apiKey}`;
      if (from) {
          url += `&from=${from}`;
      }
  } else {
      return NextResponse.json({ error: 'Invalid endpoint or missing parameters' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
        // Try to read error body if possible
        const errorText = await response.text();
        throw new Error(`Failed to fetch from FMP: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    
    // Map data if it's the constituent request
    if (endpoint === 'sp500_constituent') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleanedData = data.map((item: any) => ({
            symbol: item.asset,
            name: item.name || item.asset, 
            sector: item.sector || 'Unknown'
        }));
        return NextResponse.json(cleanedData);
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch market data' }, { status: 500 });
  }
}
