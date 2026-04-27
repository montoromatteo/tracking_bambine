'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Baby, BabyEvent, EventType } from '@/lib/types';
import EventCard from '@/components/EventCard';
import EditEventModal from '@/components/EditEventModal';
import DailySummary from '@/components/DailySummary';
import IntakeChart from '@/components/IntakeChart';
import AvgFeedingMlChart from '@/components/AvgFeedingMlChart';
import PumpingChart from '@/components/PumpingChart';
import FrequencyChart from '@/components/FrequencyChart';
import WeightChart from '@/components/WeightChart';

type Tab = 'lista' | 'riepilogo' | 'grafici';

export default function StoricoPage() {
  const [tab, setTab] = useState<Tab>('lista');
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [filterBaby, setFilterBaby] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<BabyEvent | null>(null);

  const supabase = createClient();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('events')
      .select('*, baby:babies(*)')
      .order('occurred_at', { ascending: false })
      .limit(100);

    if (filterBaby !== 'all') {
      query = query.eq('baby_id', filterBaby);
    }
    if (filterType !== 'all') {
      query = query.eq('event_type', filterType as EventType);
    }

    const { data } = await query;
    if (data) setEvents(data as BabyEvent[]);
    setLoading(false);
  }, [filterBaby, filterType]);

  useEffect(() => {
    supabase.from('babies').select('*').order('short_name').then(({ data }) => {
      if (data) setBabies(data);
    });
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Reload when navigating back to this page
  useEffect(() => {
    const handleFocus = () => loadEvents();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadEvents]);

  const handleDelete = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEditSaved = (updated: BabyEvent) => {
    setEvents((prev) =>
      prev
        .map((e) => (e.id === updated.id ? updated : e))
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    );
  };

  // Group events by date
  const groupedEvents = events.reduce<Record<string, BabyEvent[]>>((acc, event) => {
    const date = new Date(event.occurred_at).toLocaleDateString('it-IT');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-gray-800">Storico</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['lista', 'riepilogo', 'grafici'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all tap-target ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lista Tab */}
      {tab === 'lista' && (
        <>
          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterBaby}
              onChange={(e) => setFilterBaby(e.target.value)}
              className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm border-2 border-transparent focus:border-blue-300 focus:outline-none"
            >
              <option value="all">Tutte</option>
              {babies.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm border-2 border-transparent focus:border-blue-300 focus:outline-none"
            >
              <option value="all">Tutti i tipi</option>
              <option value="feeding_bottle">Biberon</option>
              <option value="feeding_breast">Seno</option>
              <option value="pumping">Tirare Latte</option>
              <option value="stool">Feci</option>
              <option value="urine">Urine</option>
              <option value="weight">Peso</option>
              <option value="brufen">Brufen</option>
              <option value="eparina">Eparina</option>
              <option value="vitamin_dk">Vitamine DK</option>
              <option value="bath">Bagnetto</option>
              <option value="note">Nota</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Caricamento...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nessun evento trovato</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                <div key={date}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">
                    {date}
                  </h3>
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onDelete={handleDelete}
                        onEdit={setEditingEvent}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Riepilogo Tab */}
      {tab === 'riepilogo' && <DailySummary babies={babies} />}

      {/* Grafici Tab */}
      {tab === 'grafici' && (
        <div className="space-y-6">
          <IntakeChart />
          <AvgFeedingMlChart />
          <PumpingChart />
          <FrequencyChart />
          <WeightChart />
        </div>
      )}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}
