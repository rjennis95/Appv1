import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';

interface MarketBreadthChartProps {
  data: { date: string; percentageAbove: number }[];
}

export const MarketBreadthChart: React.FC<MarketBreadthChartProps> = ({ data }) => {
  // Ensure we display last 252 days
  const displayData = data.slice(-252);

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={displayData}>
          <defs>
            <linearGradient id="colorBreadth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00ff41" stopOpacity={0}/>
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
            domain={[0, 100]}
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
            orientation="right"
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0d1117', borderColor: '#333', color: '#c9d1d9' }}
            itemStyle={{ color: '#00ff41' }}
            labelStyle={{ color: '#666' }}
            formatter={(value: number) => [value.toFixed(1) + '%', 'Stocks > 20EMA']}
          />
          <Area 
            type="monotone" 
            dataKey="percentageAbove" 
            stroke="#00ff41" 
            fillOpacity={1} 
            fill="url(#colorBreadth)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
