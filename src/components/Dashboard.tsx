'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fetchSP500Index, processBreadth, calculateEMA, FMPHistoricalPrice } from '@/lib/fmp';
import { getBreadthData, saveBreadthData, getLastUpdated, setLastUpdated } from '@/lib/db';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ChartData {
  date: string;
  price: number;
  ema50: number;
  distance: number;
  zero?: number;
}

interface BreadthData {
  date: string;
  value: number;
}

export default function Dashboard() {
  const [sp500Data, setSp500Data] = useState<ChartData[]>([]);
  const [breadthData, setBreadthData] = useState<BreadthData[]>([]);
  const [loadingBreadth, setLoadingBreadth] = useState(false);
  const [progress, setProgress] = useState({ count: 0, total: 500 });
  const [loadingIndex, setLoadingIndex] = useState(true);
  
  const breadthFetchRef = useRef(false);

  // Fetch Index Data
  useEffect(() => {
    const loadIndex = async () => {
      setLoadingIndex(true);
      try {
        const data = await fetchSP500Index();
        if (data && data.historical) {
            // Sort ascending
            const sorted: FMPHistoricalPrice[] = [...data.historical].reverse();
            
            // Calculate 50-day EMA
            const closes = sorted.map((d) => d.close);
            const ema50 = calculateEMA(closes, 50);
            
            // Prepare data for charts
            // Panel 1: Price
            // Panel 2: % Distance from EMA50: (Price - EMA) / EMA * 100
            
            const processed: ChartData[] = sorted.map((d, i) => ({
                date: d.date,
                price: d.close,
                ema50: ema50[i],
                distance: ema50[i] ? ((d.close - ema50[i]) / ema50[i]) * 100 : 0
            }));

            // Filter for last 1 year
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const cutoff = oneYearAgo.toISOString().split('T')[0];
            
            setSp500Data(processed.filter((d) => d.date >= cutoff));
        }
      } catch (error) {
          console.error('Error fetching S&P 500 index:', error);
      } finally {
          setLoadingIndex(false);
      }
    };

    loadIndex();
  }, []);

  // Handle Breadth Data
  useEffect(() => {
    if (breadthFetchRef.current) return;

    const loadBreadth = async () => {
        breadthFetchRef.current = true;
        setLoadingBreadth(true);
        try {
            // Check DB
            const cached = await getBreadthData();
            const lastUpdated = await getLastUpdated();
            const today = new Date().toISOString().split('T')[0];

            if (cached.length > 0 && lastUpdated && lastUpdated.lastUpdated === today) {
                // Up to date
                setBreadthData(cached);
                setLoadingBreadth(false);
                return;
            }

            if (cached.length === 0) {
                 // Empty
                 const data = await processBreadth((c, t) => setProgress({ count: c, total: t }));
                 await saveBreadthData(data);
                 await setLastUpdated(today);
                 setBreadthData(data);
            } else {
                // Has data but maybe old
                // We show cached data first
                setBreadthData(cached);
                
                if (!lastUpdated || lastUpdated.lastUpdated !== today) {
                    console.log('Data outdated, updating...');
                    const data = await processBreadth((c, t) => setProgress({ count: c, total: t }));
                    await saveBreadthData(data);
                    await setLastUpdated(today);
                    setBreadthData(data);
                }
            }

        } catch (e) {
            console.error('Error loading breadth:', e);
        } finally {
            setLoadingBreadth(false);
            breadthFetchRef.current = false; 
        }
    };

    loadBreadth();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl text-xs">
          <p className="font-bold text-zinc-300">{label}</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100 border-b border-zinc-800 pb-2">Short Term Market Dashboard</h1>
      
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        
        {/* Panel 1: S&P 500 Price */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 h-[400px] flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">S&P 500 Index Price (1 Year)</h2>
          <div className="flex-1 min-h-0">
             {loadingIndex ? (
                 <div className="h-full flex items-center justify-center text-zinc-500">Loading Index...</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sp500Data}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} orientation="right" tick={{fill: '#71717a', fontSize: 10}} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" name="Price" />
                    </AreaChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        {/* Panel 2: S&P 500 % Distance from 50-day EMA */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 h-[400px] flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">S&P 500 % Distance from 50d EMA</h2>
          <div className="flex-1 min-h-0">
             {loadingIndex ? (
                 <div className="h-full flex items-center justify-center text-zinc-500">Loading...</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sp500Data}>
                    <defs>
                        <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis orientation="right" tick={{fill: '#71717a', fontSize: 10}} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="distance" stroke="#10b981" fillOpacity={1} fill="url(#colorDist)" name="% Distance" />
                    {/* Zero line */}
                    <Line dataKey="zero" data={sp500Data.map(d => ({...d, zero: 0}))} stroke="#52525b" strokeDasharray="3 3" dot={false} strokeWidth={1}/>
                    </AreaChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        {/* Panel 3: Market Breadth */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 h-[400px] flex flex-col relative">
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">Market Breadth (% Stocks &gt; 20d EMA)</h2>
          <div className="flex-1 min-h-0">
            {loadingBreadth && breadthData.length === 0 ? (
                <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm rounded-lg">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <div className="text-zinc-300 font-medium">Crunching Market Breadth</div>
                    <div className="text-zinc-500 text-sm mt-1">{progress.count}/{progress.total} stocks analyzed...</div>
                    <div className="w-64 h-1 bg-zinc-800 mt-4 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300 ease-out"
                            style={{ width: `${(progress.count / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            ) : null}
            
            {breadthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={breadthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis orientation="right" domain={[0, 100]} tick={{fill: '#71717a', fontSize: 10}} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} name="% Above 20d EMA" />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                !loadingBreadth && <div className="h-full flex items-center justify-center text-zinc-500">No Data Available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
