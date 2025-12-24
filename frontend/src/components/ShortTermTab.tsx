import React, { useEffect, useState } from 'react';
import { fetchSP500Price } from '../services/api';
import { crunchData } from '../services/dataCruncher';
import { PriceChart } from './PriceChart';
import { TrendDistanceChart } from './TrendDistanceChart';
import { MarketBreadthChart } from './MarketBreadthChart';
import { ProgressBar } from './ProgressBar';
import { DailyPrice } from '../types';

export const ShortTermTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Initializing...');
  const [sp500Price, setSp500Price] = useState<DailyPrice[]>([]);
  const [breadthData, setBreadthData] = useState<{ date: string; percentageAbove: number }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch S&P 500 Price (parallel with crunch if possible, but crunch is heavy)
        // We can start price fetch first
        const pricePromise = fetchSP500Price(252 + 50); // Fetch extra for EMA calc locally if needed

        const breadthPromise = crunchData((percent, message) => {
          setProgress(percent);
          setProgressMessage(message);
        });

        const [priceData, breadth] = await Promise.all([pricePromise, breadthPromise]);

        const sortedPrice = priceData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setSp500Price(sortedPrice);
        
        setBreadthData(breadth);
      } catch (e) {
        console.error("Error loading data", e);
        setProgressMessage('Error loading data. Check API Key.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-terminal-bg text-terminal-text">
        <ProgressBar progress={progress} message={progressMessage} />
      </div>
    );
  }

  // Slice data to last 252 days
  const last252Prices = sp500Price.slice(-252); 
  // Wait, if I reversed it, it's old->new. So slice(-252) gives last year.
  // Note: need to verify sort order.

  return (
    <div className="min-h-screen bg-terminal-bg p-4 text-terminal-text font-mono">
      <header className="mb-6 border-b border-terminal-text pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-terminal-green">Market Terminal // Short Term</h1>
        <div className="text-xs text-gray-500 mt-1">S&P 500 ANALYSIS • 1 YEAR VIEW</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[80vh]">
        <div className="border border-gray-800 bg-[#0d1117] p-2 rounded relative">
          <h2 className="absolute top-2 left-2 text-sm font-bold text-terminal-blue bg-terminal-bg px-2 z-10">S&P 500 PRICE</h2>
          <PriceChart data={last252Prices} />
        </div>
        <div className="border border-gray-800 bg-[#0d1117] p-2 rounded relative">
           <h2 className="absolute top-2 left-2 text-sm font-bold text-terminal-orange bg-terminal-bg px-2 z-10">TREND DISTANCE (50D EMA)</h2>
          <TrendDistanceChart data={sp500Price} /> 
        </div>
        <div className="border border-gray-800 bg-[#0d1117] p-2 rounded relative">
           <h2 className="absolute top-2 left-2 text-sm font-bold text-terminal-green bg-terminal-bg px-2 z-10">MARKET BREADTH (% {'>'} 20D EMA)</h2>
          <MarketBreadthChart data={breadthData} />
        </div>
      </div>
    </div>
  );
};
