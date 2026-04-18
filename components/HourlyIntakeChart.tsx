'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { BABY_COLORS } from '@/lib/constants';
import { startOfDay, endOfDay } from 'date-fns';
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

  const renderDot = (key: 'amelia' | 'adele', color: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DotRenderer = (props: any) => {
      const { cx, cy, payload, index } = props;
      const value = payload ? (payload[key] as number) : 0;
      if (!value || value <= 0 || cx == null || cy == null) {
        return <g key={`empty-${key}-${index ?? 0}`} />;
      }
      return (
        <circle
          key={`dot-${key}-${index ?? 0}`}
          cx={cx}
          cy={cy}
          r={3}
          fill={color}
          stroke={color}
        />
      );
    };
    DotRenderer.displayName = `HourlyDot-${key}`;
    return DotRenderer;
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">ml per ora (oggi)</h3>
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(h) => `Ore ${h}:00`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="amelia"
              name="Amelia"
              stroke={BABY_COLORS.AM.chart}
              strokeWidth={2}
              dot={renderDot('amelia', BABY_COLORS.AM.chart)}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="adele"
              name="Adele"
              stroke={BABY_COLORS.AD.chart}
              strokeWidth={2}
              dot={renderDot('adele', BABY_COLORS.AD.chart)}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
