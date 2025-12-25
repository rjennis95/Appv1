import { NextResponse } from 'next/server';

export async function GET() {
  const API_KEY = process.env.FMP_API_KEY;
  if (!API_KEY) return NextResponse.json({ error: 'Server: FMP_API_KEY is missing' }, { status: 500 });

  try {
    const res = await fetch(`https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${API_KEY}`);
    if (!res.ok) throw new Error(`FMP API Error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
