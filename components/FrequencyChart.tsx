'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { BABY_COLORS } from '@/lib/constants';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
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

interface DataPoint {
  label: string;
  amelia: number;
  adele: number;
}

export default function FrequencyChart() {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const startDate = subDays(new Date(), 7);

      const { data: babies } = await supabase.from('babies').select('*');
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .in('event_type', ['feeding_bottle', 'feeding_breast'])
        .gte('occurred_at', startDate.toISOString());

      if (!babies || !events) return;

      const amelia = babies.find((b) => b.short_name === 'AM');
      const adele = babies.find((b) => b.short_name === 'AD');
      if (!amelia || !adele) return;

      const points: DataPoint[] = [];
      for (let i = 7; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const dayEvents = events.filter((e) => {
          const t = new Date(e.occurred_at);
          return t >= dayStart && t <= dayEnd;
        });

        const ameliaFeedings = dayEvents.filter((e) => e.baby_id === amelia.id);
        const adeleFeedings = dayEvents.filter((e) => e.baby_id === adele.id);

        points.push({
          label: format(day, 'dd/MM'),
          amelia: new Set(ameliaFeedings.map((e) => e.occurred_at)).size,
          adele: new Set(adeleFeedings.map((e) => e.occurred_at)).size,
        });
      }

      setData(points);
    }
    load();
  }, []);

  if (data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Poppate al giorno</h3>
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="amelia" name="Amelia" fill={BABY_COLORS.AM.chart} radius={[4, 4, 0, 0]} />
            <Bar dataKey="adele" name="Adele" fill={BABY_COLORS.AD.chart} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
