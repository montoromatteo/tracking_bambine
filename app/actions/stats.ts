'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { DailySummary, ChartDataPoint, FrequencyDataPoint, WeightDataPoint } from '@/lib/types';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function getDailySummary(date: Date, babyId?: string): Promise<DailySummary[]> {
  const supabase = createServerSupabaseClient();
  const dayStart = startOfDay(date).toISOString();
  const dayEnd = endOfDay(date).toISOString();

  // Get babies
  const { data: babies } = await supabase.from('babies').select('*');
  if (!babies) return [];

  const filteredBabies = babyId ? babies.filter((b) => b.id === babyId) : babies;

  const summaries: DailySummary[] = [];

  for (const baby of filteredBabies) {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('baby_id', baby.id)
      .gte('occurred_at', dayStart)
      .lte('occurred_at', dayEnd);

    if (!events) continue;

    const feedings = events.filter(
      (e) => e.event_type === 'feeding_bottle' || e.event_type === 'feeding_breast'
    );
    const bottleFeedings = events.filter((e) => e.event_type === 'feeding_bottle');
    const breastFeedings = events.filter((e) => e.event_type === 'feeding_breast');
    const stools = events.filter((e) => e.event_type === 'stool');
    const urines = events.filter((e) => e.event_type === 'urine');

    const totalMl = bottleFeedings.reduce((sum, e) => sum + (e.amount_ml || 0), 0);
    const lastFeeding = feedings.sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    )[0];

    summaries.push({
      date: format(date, 'yyyy-MM-dd'),
      baby_id: baby.id,
      baby_name: baby.name,
      total_ml: totalMl,
      feeding_count: feedings.length,
      breast_count: breastFeedings.length,
      bottle_count: bottleFeedings.length,
      stool_count: stools.length,
      urine_count: urines.length,
      last_feeding_at: lastFeeding?.occurred_at || null,
    });
  }

  return summaries;
}

export async function getChartData(days: number = 7): Promise<{
  intake: ChartDataPoint[];
  frequency: FrequencyDataPoint[];
  weight: WeightDataPoint[];
}> {
  const supabase = createServerSupabaseClient();
  const startDate = subDays(new Date(), days);

  const { data: babies } = await supabase.from('babies').select('*');
  if (!babies) return { intake: [], frequency: [], weight: [] };

  const amelia = babies.find((b) => b.short_name === 'AM');
  const adele = babies.find((b) => b.short_name === 'AD');
  if (!amelia || !adele) return { intake: [], frequency: [], weight: [] };

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('occurred_at', startDate.toISOString())
    .order('occurred_at');

  if (!events) return { intake: [], frequency: [], weight: [] };

  // Group events by day
  const dayMap = new Map<string, typeof events>();
  for (const event of events) {
    const day = format(new Date(event.occurred_at), 'yyyy-MM-dd');
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(event);
  }

  const intake: ChartDataPoint[] = [];
  const frequency: FrequencyDataPoint[] = [];
  const weight: WeightDataPoint[] = [];

  for (const [day, dayEvents] of dayMap) {
    // Intake chart
    const ameliaMl = dayEvents
      .filter((e) => e.baby_id === amelia.id && e.event_type === 'feeding_bottle')
      .reduce((sum, e) => sum + (e.amount_ml || 0), 0);
    const adeleMl = dayEvents
      .filter((e) => e.baby_id === adele.id && e.event_type === 'feeding_bottle')
      .reduce((sum, e) => sum + (e.amount_ml || 0), 0);

    intake.push({ date: day, amelia_ml: ameliaMl, adele_ml: adeleMl });

    // Frequency chart
    const ameliaCount = dayEvents.filter(
      (e) =>
        e.baby_id === amelia.id &&
        (e.event_type === 'feeding_bottle' || e.event_type === 'feeding_breast')
    ).length;
    const adeleCount = dayEvents.filter(
      (e) =>
        e.baby_id === adele.id &&
        (e.event_type === 'feeding_bottle' || e.event_type === 'feeding_breast')
    ).length;

    frequency.push({ date: day, amelia_count: ameliaCount, adele_count: adeleCount });

    // Weight chart
    const ameliaWeight = dayEvents.find(
      (e) => e.baby_id === amelia.id && e.event_type === 'weight'
    );
    const adeleWeight = dayEvents.find(
      (e) => e.baby_id === adele.id && e.event_type === 'weight'
    );

    if (ameliaWeight || adeleWeight) {
      weight.push({
        date: day,
        amelia_grams: ameliaWeight?.weight_grams || null,
        adele_grams: adeleWeight?.weight_grams || null,
      });
    }
  }

  return { intake, frequency, weight };
}
