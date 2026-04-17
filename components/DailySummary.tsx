'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Baby } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/date-utils';
import { BABY_COLORS } from '@/lib/constants';
import { startOfDay, endOfDay, addDays, subDays } from 'date-fns';

interface DailySummaryProps {
  babies: Baby[];
}

interface BabySummary {
  total_ml: number;
  feeding_count: number;
  breast_count: number;
  bottle_count: number;
  stool_count: number;
  urine_count: number;
  last_feeding_at: string | null;
  vitamin_bk_given: boolean;
  last_weight_grams: number | null;
  last_weight_at: string | null;
}

export default function DailySummary({ babies }: DailySummaryProps) {
  const [date, setDate] = useState(new Date());
  const [summaries, setSummaries] = useState<Record<string, BabySummary>>({});
  const [pumpingCount, setPumpingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('occurred_at', dayStart)
        .lte('occurred_at', dayEnd);

      if (!events) {
        setLoading(false);
        return;
      }

      const newSummaries: Record<string, BabySummary> = {};

      for (const baby of babies) {
        const babyEvents = events.filter((e) => e.baby_id === baby.id);
        const bottleFeedings = babyEvents.filter((e) => e.event_type === 'feeding_bottle');
        const breastFeedings = babyEvents.filter((e) => e.event_type === 'feeding_breast');
        const feedings = [...bottleFeedings, ...breastFeedings];
        const feedingCount = new Set(feedings.map((e) => e.occurred_at)).size;
        const stools = babyEvents.filter((e) => e.event_type === 'stool');
        const urines = babyEvents.filter((e) => e.event_type === 'urine');

        const lastFeeding = feedings.sort(
          (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        )[0];

        const vitaminBk = babyEvents.some((e) => e.event_type === 'vitamin_bk');
        const weightEvents = babyEvents
          .filter((e) => e.event_type === 'weight')
          .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

        newSummaries[baby.id] = {
          total_ml: bottleFeedings.reduce((sum, e) => sum + (e.amount_ml || 0), 0),
          feeding_count: feedingCount,
          breast_count: breastFeedings.length,
          bottle_count: bottleFeedings.length,
          stool_count: stools.length,
          urine_count: urines.length,
          last_feeding_at: lastFeeding?.occurred_at || null,
          vitamin_bk_given: vitaminBk,
          last_weight_grams: weightEvents[0]?.weight_grams || null,
          last_weight_at: weightEvents[0]?.occurred_at || null,
        };
      }

      setPumpingCount(events.filter((e) => e.event_type === 'pumping').length);
      setSummaries(newSummaries);
      setLoading(false);
    }

    if (babies.length > 0) load();
  }, [date, babies]);

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate(subDays(date, 1))}
          className="p-2 text-gray-500 tap-target"
        >
          ←
        </button>
        <span className="font-semibold text-gray-700">{formatDate(date)}</span>
        <button
          onClick={() => setDate(addDays(date, 1))}
          className="p-2 text-gray-500 tap-target"
        >
          →
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Caricamento...</div>
      ) : (
        <>
          {babies.map((baby) => {
            const summary = summaries[baby.id];
            if (!summary) return null;
            const colors = BABY_COLORS[baby.short_name as keyof typeof BABY_COLORS];

            return (
              <div key={baby.id} className={`rounded-xl p-4 ${colors.bg} border-2 ${colors.border}`}>
                <h3 className={`font-bold text-lg ${colors.text} mb-3`}>{baby.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Totale ml" value={`${summary.total_ml} ml`} />
                  <Stat label="Poppate" value={`${summary.feeding_count} (${summary.bottle_count}🍼 ${summary.breast_count}🤱)`} />
                  <Stat label="Feci" value={`${summary.stool_count}`} />
                  <Stat label="Urine" value={`${summary.urine_count}`} />
                  {summary.last_feeding_at && (
                    <Stat label="Ultima poppata" value={formatTime(summary.last_feeding_at)} />
                  )}
                  <Stat
                    label="Vitamine BK"
                    value={summary.vitamin_bk_given ? '✅ Date' : '❌ Mancanti'}
                  />
                  {summary.last_weight_grams && (
                    <Stat
                      label="Peso"
                      value={`${(summary.last_weight_grams / 1000).toFixed(2)} kg`}
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div className="rounded-xl p-4 bg-blue-50 border-2 border-blue-200">
            <Stat label="Tirare latte oggi" value={`${pumpingCount} volte`} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
    </div>
  );
}
