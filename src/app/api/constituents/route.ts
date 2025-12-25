import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${apiKey}`);
    if (!response.ok) {
      throw new Error('Failed to fetch from FMP');
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch constituents' }, { status: 500 });
  }
}
