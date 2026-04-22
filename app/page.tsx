'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Baby } from '@/lib/types';
import { BABY_COLORS } from '@/lib/constants';
import { formatTime, formatRelative, formatDayTime } from '@/lib/date-utils';
import { startOfDay, endOfDay, subDays, differenceInWeeks } from 'date-fns';
import HourlyIntakeChart from '@/components/HourlyIntakeChart';

interface BabyStats {
  total_ml: number;
  feeding_count: number;
  stool_count: number;
  urine_count: number;
  last_feeding_at: string | null;
  last_feeding_ml: number | null;
  vitamin_dk_given: boolean;
  vitamin_dk_weeks_left: number | null;
  last_weight_grams: number | null;
  last_weight_at: string | null;
  avg_ml_same_time: number | null;
  delta_pct: number | null;
}

const BASELINE_DAYS = 7;
const TREND_FLAT_THRESHOLD = 10;

const VITAMIN_DK_COURSE_WEEKS = 10;

interface MammaStats {
  brufen_taken_today: boolean;
  brufen_last_at: string | null;
  pumping_count_today: number;
  pumping_last_at: string | null;
}

export default function HomePage() {
  const [babies, setBabies] = useState<Baby[]>([]);
  const [stats, setStats] = useState<Record<string, BabyStats>>({});
  const [mammaStats, setMammaStats] = useState<MammaStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const now = new Date();
      const dayStart = startOfDay(now).toISOString();
      const dayEnd = endOfDay(now).toISOString();

      const { data: babiesData } = await supabase.from('babies').select('*').order('short_name');
      if (!babiesData) return;
      setBabies(babiesData);

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('occurred_at', dayStart)
        .lte('occurred_at', dayEnd);

      if (!events) {
        setLoading(false);
        return;
      }

      // Baseline: last BASELINE_DAYS completed days (excluding today) of feeding_bottle events
      const baselineStart = startOfDay(subDays(now, BASELINE_DAYS)).toISOString();
      const { data: baselineEvents } = await supabase
        .from('events')
        .select('baby_id, occurred_at, amount_ml')
        .eq('event_type', 'feeding_bottle')
        .gte('occurred_at', baselineStart)
        .lt('occurred_at', dayStart);

      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const newStats: Record<string, BabyStats> = {};

      for (const baby of babiesData) {
        const babyEvents = events.filter((e) => e.baby_id === baby.id);
        const feedings = babyEvents.filter(
          (e) => e.event_type === 'feeding_bottle' || e.event_type === 'feeding_breast'
        );
        const feedingCount = new Set(feedings.map((e) => e.occurred_at)).size;
        const bottleFeedings = babyEvents.filter((e) => e.event_type === 'feeding_bottle');
        const stools = babyEvents.filter((e) => e.event_type === 'stool');
        const urines = babyEvents.filter((e) => e.event_type === 'urine');

        const lastFeeding = feedings.sort(
          (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        )[0];

        const vitaminDk = babyEvents.some((e) => e.event_type === 'vitamin_dk');

        // Get first-ever vitamin_dk for this baby to calc weeks left
        const { data: firstVitDk } = await supabase
          .from('events')
          .select('occurred_at')
          .eq('event_type', 'vitamin_dk')
          .eq('baby_id', baby.id)
          .order('occurred_at', { ascending: true })
          .limit(1);

        let vitDkWeeksLeft: number | null = null;
        if (firstVitDk && firstVitDk.length > 0) {
          const weeksElapsed = differenceInWeeks(now, new Date(firstVitDk[0].occurred_at));
          vitDkWeeksLeft = Math.max(0, VITAMIN_DK_COURSE_WEEKS - weeksElapsed);
        }

        // Get last weight ever for this baby
        const { data: lastWeight } = await supabase
          .from('events')
          .select('occurred_at, weight_grams')
          .eq('event_type', 'weight')
          .eq('baby_id', baby.id)
          .order('occurred_at', { ascending: false })
          .limit(1);

        // Compute "vs. solito" trend: today-so-far vs same-time-of-day avg over baseline days
        const todaySoFarMl = bottleFeedings.reduce((sum, e) => sum + (e.amount_ml || 0), 0);
        let avgMlSameTime: number | null = null;
        let deltaPct: number | null = null;
        if (baselineEvents && baselineEvents.length > 0) {
          const perDay: Record<string, number> = {};
          for (let i = 1; i <= BASELINE_DAYS; i++) {
            const d = subDays(now, i);
            perDay[d.toISOString().slice(0, 10)] = 0;
          }
          for (const e of baselineEvents) {
            if (e.baby_id !== baby.id) continue;
            const t = new Date(e.occurred_at);
            const key = t.toISOString().slice(0, 10);
            if (!(key in perDay)) continue;
            const minutes = t.getHours() * 60 + t.getMinutes();
            if (minutes <= nowMinutes) perDay[key] += e.amount_ml || 0;
          }
          const daysCounted = Object.keys(perDay).length;
          if (daysCounted >= BASELINE_DAYS) {
            const sum = Object.values(perDay).reduce((a, b) => a + b, 0);
            avgMlSameTime = sum / daysCounted;
            if (avgMlSameTime > 0) {
              deltaPct = ((todaySoFarMl - avgMlSameTime) / avgMlSameTime) * 100;
            }
          }
        }

        newStats[baby.id] = {
          total_ml: bottleFeedings.reduce((sum, e) => sum + (e.amount_ml || 0), 0),
          feeding_count: feedingCount,
          stool_count: stools.length,
          urine_count: urines.length,
          last_feeding_at: lastFeeding?.occurred_at || null,
          last_feeding_ml: lastFeeding?.amount_ml || null,
          vitamin_dk_given: vitaminDk,
          vitamin_dk_weeks_left: vitDkWeeksLeft,
          last_weight_grams: lastWeight?.[0]?.weight_grams || null,
          last_weight_at: lastWeight?.[0]?.occurred_at || null,
          avg_ml_same_time: avgMlSameTime,
          delta_pct: deltaPct,
        };
      }

      setStats(newStats);

      // Mamma stats
      const todayBrufen = events.filter((e) => e.event_type === 'brufen');
      const todayPumping = events.filter((e) => e.event_type === 'pumping');

      const { data: lastBrufenAll } = await supabase
        .from('events')
        .select('occurred_at')
        .eq('event_type', 'brufen')
        .order('occurred_at', { ascending: false })
        .limit(1);

      const lastPumping = todayPumping.sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )[0];

      setMammaStats({
        brufen_taken_today: todayBrufen.length > 0,
        brufen_last_at: lastBrufenAll?.[0]?.occurred_at || null,
        pumping_count_today: todayPumping.length,
        pumping_last_at: lastPumping?.occurred_at || null,
      });

      setLoading(false);
    }
    load();

    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-gray-800">Tracking Bambine</h1>
      <p className="text-sm text-gray-500">Oggi</p>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Caricamento...</div>
      ) : (
        <>
          {babies.map((baby) => {
            const s = stats[baby.id];
            if (!s) return null;
            const colors = BABY_COLORS[baby.short_name as keyof typeof BABY_COLORS];

            return (
              <div
                key={baby.id}
                className={`rounded-2xl p-4 ${colors.bg} border-2 ${colors.border}`}
              >
                <h2 className={`font-bold text-lg ${colors.text} mb-3`}>
                  {baby.name}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Totale ml</div>
                    <div className="text-2xl font-bold text-gray-800">{s.total_ml}</div>
                    <TrendBadge deltaPct={s.delta_pct} avgMlSameTime={s.avg_ml_same_time} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Poppate</div>
                    <div className="text-2xl font-bold text-gray-800">{s.feeding_count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Feci / Urine</div>
                    <div className="text-lg font-semibold text-gray-700">
                      {s.stool_count} 💩 / {s.urine_count} 💦
                    </div>
                  </div>
                  {s.last_feeding_at && (
                    <div>
                      <div className="text-xs text-gray-500">Ultima poppata</div>
                      <div className="text-sm font-semibold text-gray-700">
                        {formatTime(s.last_feeding_at)}
                        {s.last_feeding_ml && ` (${s.last_feeding_ml} ml)`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatRelative(s.last_feeding_at)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500">Vitamine DK</div>
                    <div className="text-lg font-semibold">
                      {s.vitamin_dk_given ? '✅ Date' : '❌ Mancanti'}
                    </div>
                    {s.vitamin_dk_weeks_left !== null && (
                      <div className="text-xs text-gray-400">
                        {s.vitamin_dk_weeks_left === 0
                          ? 'Ciclo completato'
                          : `${s.vitamin_dk_weeks_left} sett. rimaste`}
                      </div>
                    )}
                  </div>
                  {s.last_weight_grams && s.last_weight_at && (
                    <div>
                      <div className="text-xs text-gray-500">Ultimo peso</div>
                      <div className="text-lg font-semibold text-gray-800">
                        {(s.last_weight_grams / 1000).toFixed(2)} kg
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDayTime(s.last_weight_at)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <HourlyIntakeChart />

          {/* Mamma Section */}
          {mammaStats && (
            <div className="rounded-2xl p-4 bg-teal-50 border-2 border-teal-200">
              <h2 className="font-bold text-lg text-teal-700 mb-3">Mamma</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Brufen */}
                <div>
                  <div className="text-xs text-gray-500">Brufen</div>
                  {mammaStats.brufen_last_at ? (
                    <div className="text-sm font-semibold text-gray-700">
                      Ultimo: {formatDayTime(mammaStats.brufen_last_at)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Mai preso</div>
                  )}
                </div>

                {/* Tirare latte */}
                <div>
                  <div className="text-xs text-gray-500">Tirare latte oggi</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {mammaStats.pumping_count_today} volte
                  </div>
                  {mammaStats.pumping_last_at && (
                    <div className="text-xs text-gray-400">
                      Ultimo: {formatTime(mammaStats.pumping_last_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {babies.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Avvia Supabase locale per iniziare
            </div>
          )}
        </>
      )}

      <Link
        href="/inserisci"
        className="block w-full py-4 bg-blue-600 text-white rounded-xl text-center text-lg font-semibold active:bg-blue-700 transition-colors tap-target"
      >
        + Inserisci
      </Link>
    </div>
  );
}

function TrendBadge({
  deltaPct,
  avgMlSameTime,
}: {
  deltaPct: number | null;
  avgMlSameTime: number | null;
}) {
  if (deltaPct === null || avgMlSameTime === null) return null;
  const rounded = Math.round(deltaPct);
  const abs = Math.abs(rounded);
  const tooltip = `Media allo stesso orario, ultimi ${BASELINE_DAYS} gg: ${Math.round(avgMlSameTime)} ml`;
  let label: string;
  let cls: string;
  if (abs < TREND_FLAT_THRESHOLD) {
    label = '≈ in linea';
    cls = 'bg-gray-100 text-gray-600';
  } else if (rounded > 0) {
    label = `↑ ${abs}% vs solito`;
    cls = 'bg-green-100 text-green-700';
  } else {
    label = `↓ ${abs}% vs solito`;
    cls = 'bg-amber-100 text-amber-700';
  }
  return (
    <div
      title={tooltip}
      className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}
    >
      {label}
    </div>
  );
}
