'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { BABY_COLORS } from '@/lib/constants';
import { startOfDay, endOfDay } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface HourPoint {
  hour: string;
  amelia: number;
  adele: number;
}

export default function HourlyIntakeChart() {
  const [data, setData] = useState<HourPoint[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const now = new Date();
      const dayStart = startOfDay(now).toISOString();
      const dayEnd = endOfDay(now).toISOString();

      const [{ data: babies }, { data: events }] = await Promise.all([
        supabase.from('babies').select('*'),
        supabase
          .from('events')
          .select('*')
          .eq('event_type', 'feeding_bottle')
          .gte('occurred_at', dayStart)
          .lte('occurred_at', dayEnd),
      ]);

      if (!babies || !events) return;

      const amelia = babies.find((b) => b.short_name === 'AM');
      const adele = babies.find((b) => b.short_name === 'AD');
      if (!amelia || !adele) return;

      const buckets: HourPoint[] = Array.from({ length: 24 }, (_, h) => ({
        hour: h.toString().padStart(2, '0'),
        amelia: 0,
        adele: 0,
      }));

      for (const e of events) {
        const h = new Date(e.occurred_at).getHours();
        const ml = e.amount_ml || 0;
        if (e.baby_id === amelia.id) buckets[h].amelia += ml;
        else if (e.baby_id === adele.id) buckets[h].adele += ml;
      }

      setHasData(events.length > 0);
      setData(buckets);
    }
    load();

    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (!hasData) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Ml per ora (oggi)</h3>
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10 }}
              interval={2}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(h) => `Ore ${h}:00`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="amelia" name="Amelia" stackId="a" fill={BABY_COLORS.AM.chart} radius={[0, 0, 0, 0]} />
            <Bar dataKey="adele" name="Adele" stackId="a" fill={BABY_COLORS.AD.chart} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
