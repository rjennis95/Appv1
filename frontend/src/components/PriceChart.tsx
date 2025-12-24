import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DailyPrice } from '../types';
import { format, parseISO } from 'date-fns';

interface PriceChartProps {
  data: DailyPrice[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
            domain={['auto', 'auto']} 
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
            orientation="right"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0d1117', borderColor: '#333', color: '#c9d1d9' }}
            itemStyle={{ color: '#00a8ff' }}
            labelStyle={{ color: '#666' }}
            formatter={(value: number) => [value.toFixed(2), 'Close']}
          />
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#00a8ff" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4, fill: '#00a8ff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
