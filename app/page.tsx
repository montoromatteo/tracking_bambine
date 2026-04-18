'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Baby } from '@/lib/types';
import { BABY_COLORS } from '@/lib/constants';
import { formatTime, formatRelative, formatDayTime } from '@/lib/date-utils';
import { startOfDay, endOfDay, differenceInCalendarDays, differenceInWeeks } from 'date-fns';
import HourlyIntakeChart from '@/components/HourlyIntakeChart';

interface BabyStats {
  total_ml: number;
  feeding_count: number;
  stool_count: number;
  urine_count: number;
  last_feeding_at: string | null;
  last_feeding_ml: number | null;
  vitamin_bk_given: boolean;
  vitamin_bk_weeks_left: number | null;
  last_weight_grams: number | null;
  last_weight_at: string | null;
}

const VITAMIN_BK_COURSE_WEEKS = 10;

interface MammaStats {
  eparina_taken_today: boolean;
  eparina_last_at: string | null;
  eparina_days_left: number | null;
  brufen_taken_today: boolean;
  brufen_last_at: string | null;
  pumping_count_today: number;
  pumping_last_at: string | null;
}

const EPARINA_COURSE_DAYS = 5;

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

        const vitaminBk = babyEvents.some((e) => e.event_type === 'vitamin_bk');

        // Get first-ever vitamin_bk for this baby to calc weeks left
        const { data: firstVitBk } = await supabase
          .from('events')
          .select('occurred_at')
          .eq('event_type', 'vitamin_bk')
          .eq('baby_id', baby.id)
          .order('occurred_at', { ascending: true })
          .limit(1);

        let vitBkWeeksLeft: number | null = null;
        if (firstVitBk && firstVitBk.length > 0) {
          const weeksElapsed = differenceInWeeks(now, new Date(firstVitBk[0].occurred_at));
          vitBkWeeksLeft = Math.max(0, VITAMIN_BK_COURSE_WEEKS - weeksElapsed);
        }

        // Get last weight ever for this baby
        const { data: lastWeight } = await supabase
          .from('events')
          .select('occurred_at, weight_grams')
          .eq('event_type', 'weight')
          .eq('baby_id', baby.id)
          .order('occurred_at', { ascending: false })
          .limit(1);

        newStats[baby.id] = {
          total_ml: bottleFeedings.reduce((sum, e) => sum + (e.amount_ml || 0), 0),
          feeding_count: feedingCount,
          stool_count: stools.length,
          urine_count: urines.length,
          last_feeding_at: lastFeeding?.occurred_at || null,
          last_feeding_ml: lastFeeding?.amount_ml || null,
          vitamin_bk_given: vitaminBk,
          vitamin_bk_weeks_left: vitBkWeeksLeft,
          last_weight_grams: lastWeight?.[0]?.weight_grams || null,
          last_weight_at: lastWeight?.[0]?.occurred_at || null,
        };
      }

      setStats(newStats);

      // Mamma stats
      const todayEparina = events.filter((e) => e.event_type === 'eparina');
      const todayBrufen = events.filter((e) => e.event_type === 'brufen');
      const todayPumping = events.filter((e) => e.event_type === 'pumping');

      // Get first-ever eparina to calculate days left in course
      const { data: firstEparina } = await supabase
        .from('events')
        .select('occurred_at')
        .eq('event_type', 'eparina')
        .order('occurred_at', { ascending: true })
        .limit(1);

      let eparinaDaysLeft: number | null = null;
      if (firstEparina && firstEparina.length > 0) {
        const firstDate = new Date(firstEparina[0].occurred_at);
        const daysSinceStart = differenceInCalendarDays(now, firstDate);
        eparinaDaysLeft = Math.max(0, EPARINA_COURSE_DAYS - daysSinceStart);
      }

      // Get last brufen/eparina ever (for "last taken" display)
      const { data: lastBrufenAll } = await supabase
        .from('events')
        .select('occurred_at')
        .eq('event_type', 'brufen')
        .order('occurred_at', { ascending: false })
        .limit(1);

      const { data: lastEparinaAll } = await supabase
        .from('events')
        .select('occurred_at')
        .eq('event_type', 'eparina')
        .order('occurred_at', { ascending: false })
        .limit(1);

      const lastPumping = todayPumping.sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )[0];

      setMammaStats({
        eparina_taken_today: todayEparina.length > 0,
        eparina_last_at: lastEparinaAll?.[0]?.occurred_at || null,
        eparina_days_left: eparinaDaysLeft,
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
                    <div className="text-xs text-gray-500">Vitamine BK</div>
                    <div className="text-lg font-semibold">
                      {s.vitamin_bk_given ? '✅ Date' : '❌ Mancanti'}
                    </div>
                    {s.vitamin_bk_weeks_left !== null && (
                      <div className="text-xs text-gray-400">
                        {s.vitamin_bk_weeks_left === 0
                          ? 'Ciclo completato'
                          : `${s.vitamin_bk_weeks_left} sett. rimaste`}
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
                {/* Eparina */}
                <div className="col-span-2 bg-white/60 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Eparina oggi</div>
                      <div className="text-lg font-semibold">
                        {mammaStats.eparina_taken_today ? '✅ Fatta' : '❌ Da fare'}
                      </div>
                    </div>
                    {mammaStats.eparina_days_left !== null && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Giorni rimasti</div>
                        <div className={`text-2xl font-bold ${
                          mammaStats.eparina_days_left === 0 ? 'text-green-600' : 'text-teal-700'
                        }`}>
                          {mammaStats.eparina_days_left === 0
                            ? 'Finito!'
                            : mammaStats.eparina_days_left}
                        </div>
                      </div>
                    )}
                  </div>
                  {mammaStats.eparina_last_at && (
                    <div className="text-xs text-gray-400 mt-1">
                      Ultima: {formatDayTime(mammaStats.eparina_last_at)}
                    </div>
                  )}
                </div>

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
