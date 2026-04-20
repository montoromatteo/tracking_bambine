'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { BABY_COLORS } from '@/lib/constants';
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
  label: string;
  amelia: number | null;
  adele: number | null;
}

export default function AvgFeedingMlChart() {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const startDate = subDays(new Date(), 7);

      const { data: babies } = await supabase.from('babies').select('*');
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'feeding_bottle')
        .gte('occurred_at', startDate.toISOString());

      if (!babies || !events) return;

      const amelia = babies.find((b) => b.short_name === 'AM');
      const adele = babies.find((b) => b.short_name === 'AD');
      if (!amelia || !adele) return;

      const avg = (babyId: string, dayEvents: typeof events) => {
        const mine = dayEvents.filter((e) => e.baby_id === babyId);
        if (mine.length === 0) return null;
        const sum = mine.reduce((s, e) => s + (e.amount_ml || 0), 0);
        return Math.round(sum / mine.length);
      };

      const points: DataPoint[] = [];
      for (let i = 7; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const dayEvents = events.filter((e) => {
          const t = new Date(e.occurred_at);
          return t >= dayStart && t <= dayEnd;
        });

        points.push({
          label: format(day, 'dd/MM'),
          amelia: avg(amelia.id, dayEvents),
          adele: avg(adele.id, dayEvents),
        });
      }

      setData(points);
    }
    load();
  }, []);

  if (data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">ml medi per poppata</h3>
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
              dataKey="amelia"
              name="Amelia"
              stroke={BABY_COLORS.AM.chart}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="adele"
              name="Adele"
              stroke={BABY_COLORS.AD.chart}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
