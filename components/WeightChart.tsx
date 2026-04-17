'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { BABY_COLORS } from '@/lib/constants';
import { format } from 'date-fns';
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

export default function WeightChart() {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: babies } = await supabase.from('babies').select('*');
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'weight')
        .order('occurred_at');

      if (!babies || !events || events.length === 0) return;

      const amelia = babies.find((b) => b.short_name === 'AM');
      const adele = babies.find((b) => b.short_name === 'AD');
      if (!amelia || !adele) return;

      // Group by day, take latest weight per baby per day
      const dayMap = new Map<string, { amelia: number | null; adele: number | null }>();

      for (const event of events) {
        const day = format(new Date(event.occurred_at), 'yyyy-MM-dd');
        if (!dayMap.has(day)) dayMap.set(day, { amelia: null, adele: null });
        const entry = dayMap.get(day)!;

        const kg = event.weight_grams ? event.weight_grams / 1000 : null;
        if (event.baby_id === amelia.id) entry.amelia = kg;
        if (event.baby_id === adele.id) entry.adele = kg;
      }

      const points: DataPoint[] = [...dayMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, vals]) => ({
          label: format(new Date(day), 'dd/MM'),
          amelia: vals.amelia,
          adele: vals.adele,
        }));

      setData(points);
    }
    load();
  }, []);

  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-2">Andamento peso</h3>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center text-gray-400 text-sm">
          Nessun dato peso ancora
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Andamento peso (kg)</h3>
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={['dataMin - 0.05', 'dataMax + 0.05']}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg`} />
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
