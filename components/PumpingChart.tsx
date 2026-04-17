'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  date: string;
  label: string;
  ml: number;
  count: number;
}

export default function PumpingChart() {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const startDate = subDays(new Date(), 7);

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'pumping')
        .gte('occurred_at', startDate.toISOString());

      if (!events) return;

      const points: DataPoint[] = [];
      for (let i = 7; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const dayEvents = events.filter((e) => {
          const t = new Date(e.occurred_at);
          return t >= dayStart && t <= dayEnd;
        });

        points.push({
          date: dayStr,
          label: format(day, 'dd/MM'),
          ml: dayEvents.reduce((sum, e) => sum + (e.amount_ml || 0), 0),
          count: dayEvents.length,
        });
      }

      setData(points);
    }
    load();
  }, []);

  if (data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Latte tirato (ml giornalieri)</h3>
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="ml"
              name="Ml tirati"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
