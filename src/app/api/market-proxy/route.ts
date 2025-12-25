import { NextResponse } from 'next/server';

export async function GET() {
  const API_KEY = process.env.FMP_API_KEY;
  if (!API_KEY) return NextResponse.json({ error: 'Server: FMP_API_KEY is missing' }, { status: 500 });

  try {
    const res = await fetch(`https://financialmodelingprep.com/api/v3/etf-holder/SPY?apikey=${API_KEY}`);
    if (!res.ok) throw new Error(`FMP API Error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    
    // Map 'asset' to 'symbol' so the frontend doesn't break
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanedData = data.map((item: any) => ({
        symbol: item.asset,
        name: item.name || item.asset, // Fallback if name is missing
        sector: item.sector || 'Unknown'
    }));
    return NextResponse.json(cleanedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
