import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { DailyPrice } from '../types';
import { format, parseISO } from 'date-fns';
import { calculateEMA } from '../utils/indicators';

interface TrendDistanceChartProps {
  data: DailyPrice[]; // Full history
}

export const TrendDistanceChart: React.FC<TrendDistanceChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (data.length < 50) return [];
    
    const prices = data.map(d => d.close);
    const emas = calculateEMA(prices, 50);
    
    const computed = data.map((d, i) => ({
      date: d.date,
      distance: ((d.close - emas[i]) / emas[i]) * 100
    }));

    // Return last 252 days
    return computed.slice(-252);
  }, [data]);

  const offset = useMemo(() => {
    if (chartData.length === 0) return 0;
    const max = Math.max(...chartData.map(d => d.distance));
    const min = Math.min(...chartData.map(d => d.distance));
  
    if (max <= 0) return 0;
    if (min >= 0) return 1;
  
    return max / (max - min);
  }, [chartData]);

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={offset} stopColor="#ffb000" stopOpacity={0.3}/>
              <stop offset={offset} stopColor="#ffb000" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#666', fontSize: 10 }} 
            tickFormatter={(str) => format(parseISO(str), 'MMM dd')}
            minTickGap={30}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
            orientation="right"
            tickFormatter={(val) => `${val.toFixed(1)}%`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0d1117', borderColor: '#333', color: '#c9d1d9' }}
            itemStyle={{ color: '#ffb000' }}
            labelStyle={{ color: '#666' }}
            formatter={(value: number) => [value.toFixed(2) + '%', 'Distance']}
          />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="distance" 
            stroke="#ffb000" 
            fill="url(#splitColor)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
