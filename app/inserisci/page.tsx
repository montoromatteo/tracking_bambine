'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Baby, EventType } from '@/lib/types';
import { toLocalISOString } from '@/lib/date-utils';
import { ML_DEFAULT, BABY_COLORS } from '@/lib/constants';
import EventTypeSelector, { EventCategory } from '@/components/EventTypeSelector';
import BabySelector from '@/components/BabySelector';
import MlStepper from '@/components/MlStepper';
import BooleanToggle from '@/components/BooleanToggle';
import DateTimePicker from '@/components/DateTimePicker';
import Toast from '@/components/ui/Toast';

export default function InserisciPage() {
  const [babies, setBabies] = useState<Baby[]>([]);
  const [eventCategory, setEventCategory] = useState<EventCategory>('feeding');
  const [selectedBaby, setSelectedBaby] = useState<string | 'both' | null>(null);
  const [dateTime, setDateTime] = useState(toLocalISOString(new Date()));
  const [amountMl, setAmountMl] = useState(ML_DEFAULT);
  const [hasSeno, setHasSeno] = useState(false);
  const [hasFeci, setHasFeci] = useState(false);
  const [hasUrine, setHasUrine] = useState(false);
  const [weightGrams, setWeightGrams] = useState(3000);
  const [notes, setNotes] = useState('');
  const [perBabyData, setPerBabyData] = useState<Record<string, { amountMl: number; hasSeno: boolean; hasFeci: boolean; hasUrine: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const initPerBabyData = useCallback((babyList: Baby[]) => {
    const data: Record<string, { amountMl: number; hasSeno: boolean; hasFeci: boolean; hasUrine: boolean }> = {};
    for (const baby of babyList) {
      data[baby.id] = { amountMl: ML_DEFAULT, hasSeno: false, hasFeci: false, hasUrine: false };
    }
    setPerBabyData(data);
  }, []);

  const updateBabyData = useCallback((babyId: string, field: 'amountMl' | 'hasSeno' | 'hasFeci' | 'hasUrine', value: number | boolean) => {
    setPerBabyData(prev => ({
      ...prev,
      [babyId]: { ...prev[babyId], [field]: value },
    }));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('babies')
      .select('*')
      .order('short_name')
      .then(({ data }) => {
        if (data) {
          setBabies(data);
          initPerBabyData(data);
        }
      });
  }, [initPerBabyData]);

  const resetForm = useCallback(() => {
    setDateTime(toLocalISOString(new Date()));
    setAmountMl(ML_DEFAULT);
    setHasSeno(false);
    setHasFeci(false);
    setHasUrine(false);
    setNotes('');
    initPerBabyData(babies);
    // Keep eventCategory and selectedBaby for rapid re-entry
  }, [babies, initPerBabyData]);

  const handleSubmit = async () => {
    if (!noBabyCategories.includes(eventCategory) && eventCategory !== 'note' && !selectedBaby) {
      setToast({ message: 'Seleziona una bambina', type: 'error' });
      return;
    }

    if (eventCategory === 'pumping' && amountMl <= 0) {
      setToast({ message: 'Inserisci la quantita in ml', type: 'error' });
      return;
    }

    if (eventCategory === 'needs') {
      const anySelected = selectedBaby === 'both'
        ? babies.some((b) => perBabyData[b.id]?.hasFeci || perBabyData[b.id]?.hasUrine)
        : hasFeci || hasUrine;
      if (!anySelected) {
        setToast({ message: 'Seleziona almeno Feci o Urine', type: 'error' });
        return;
      }
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const occurredAt = new Date(dateTime).toISOString();

      // Determine which baby IDs to insert for
      const babyIds: (string | null)[] =
        noBabyCategories.includes(eventCategory)
          ? [null]
          : selectedBaby === 'both'
          ? babies.map((b) => b.id)
          : [selectedBaby];

      const eventsToInsert: Array<{
        baby_id: string | null;
        event_type: EventType;
        occurred_at: string;
        amount_ml: number | null;
        weight_grams: number | null;
        notes: string | null;
      }> = [];

      for (const babyId of babyIds) {
        if (eventCategory === 'feeding') {
          // Use per-baby data when both selected, shared state when single baby
          const isBoth = selectedBaby === 'both';
          const ml = isBoth && babyId ? perBabyData[babyId]?.amountMl ?? ML_DEFAULT : amountMl;
          const seno = isBoth && babyId ? perBabyData[babyId]?.hasSeno ?? false : hasSeno;
          const feci = isBoth && babyId ? perBabyData[babyId]?.hasFeci ?? false : hasFeci;
          const urine = isBoth && babyId ? perBabyData[babyId]?.hasUrine ?? false : hasUrine;

          if (ml > 0) {
            eventsToInsert.push({
              baby_id: babyId,
              event_type: 'feeding_bottle',
              occurred_at: occurredAt,
              amount_ml: ml,
              weight_grams: null,
              notes: notes || null,
            });
          }

          if (seno) {
            eventsToInsert.push({
              baby_id: babyId,
              event_type: 'feeding_breast',
              occurred_at: occurredAt,
              amount_ml: null,
              weight_grams: null,
              notes: notes || null,
            });
          }

          if (feci) {
            eventsToInsert.push({
              baby_id: babyId,
              event_type: 'stool',
              occurred_at: occurredAt,
              amount_ml: null,
              weight_grams: null,
              notes: null,
            });
          }

          if (urine) {
            eventsToInsert.push({
              baby_id: babyId,
              event_type: 'urine',
              occurred_at: occurredAt,
              amount_ml: null,
              weight_grams: null,
              notes: null,
            });
          }
        } else if (eventCategory === 'needs') {
          const isBoth = selectedBaby === 'both';
          const feci = isBoth && babyId ? perBabyData[babyId]?.hasFeci ?? false : hasFeci;
          const urine = isBoth && babyId ? perBabyData[babyId]?.hasUrine ?? false : hasUrine;

          if (feci) {
            eventsToInsert.push({
              baby_id: babyId,
              event_type: 'stool',
              occurred_at: occurredAt,
              amount_ml: null,
              weight_grams: null,
              notes: notes || null,
            });
          }

          if (urine) {
            eventsToInsert.push({
              baby_id: babyId,
              event_type: 'urine',
              occurred_at: occurredAt,
              amount_ml: null,
              weight_grams: null,
              notes: notes || null,
            });
          }
        } else if (eventCategory === 'pumping') {
          eventsToInsert.push({
            baby_id: null,
            event_type: 'pumping',
            occurred_at: occurredAt,
            amount_ml: amountMl,
            weight_grams: null,
            notes: notes || null,
          });
        } else if (eventCategory === 'weight') {
          eventsToInsert.push({
            baby_id: babyId,
            event_type: 'weight',
            occurred_at: occurredAt,
            amount_ml: null,
            weight_grams: weightGrams,
            notes: notes || null,
          });
        } else if (eventCategory === 'note') {
          eventsToInsert.push({
            baby_id: babyId || null,
            event_type: 'note',
            occurred_at: occurredAt,
            amount_ml: null,
            weight_grams: null,
            notes: notes || null,
          });
        } else if (eventCategory === 'brufen') {
          eventsToInsert.push({
            baby_id: null,
            event_type: 'brufen',
            occurred_at: occurredAt,
            amount_ml: null,
            weight_grams: null,
            notes: notes || null,
          });
        } else if (eventCategory === 'eparina') {
          eventsToInsert.push({
            baby_id: null,
            event_type: 'eparina',
            occurred_at: occurredAt,
            amount_ml: null,
            weight_grams: null,
            notes: notes || null,
          });
        } else if (eventCategory === 'vitamin_bk') {
          eventsToInsert.push({
            baby_id: babyId,
            event_type: 'vitamin_bk',
            occurred_at: occurredAt,
            amount_ml: null,
            weight_grams: null,
            notes: notes || null,
          });
        }
      }

      const { error } = await supabase.from('events').insert(eventsToInsert);

      if (error) throw error;

      setToast({ message: 'Salvato!', type: 'success' });
      resetForm();
    } catch (err) {
      setToast({ message: 'Errore nel salvataggio', type: 'error' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const noBabyCategories: EventCategory[] = ['pumping', 'brufen', 'eparina'];
  const showBabySelector = !noBabyCategories.includes(eventCategory);
  const showBothOption = eventCategory === 'feeding' || eventCategory === 'needs' || eventCategory === 'weight' || eventCategory === 'vitamin_bk';

  return (
    <div className="space-y-5 pb-4">
      <h1 className="text-xl font-bold text-gray-800">Inserisci</h1>

      {/* Date/Time */}
      <section>
        <label className="text-sm font-medium text-gray-500 mb-1 block">Quando</label>
        <DateTimePicker value={dateTime} onChange={setDateTime} />
      </section>

      {/* Event Type */}
      <section>
        <label className="text-sm font-medium text-gray-500 mb-1 block">Tipo</label>
        <EventTypeSelector selected={eventCategory} onChange={setEventCategory} />
      </section>

      {/* Baby Selector */}
      {showBabySelector && (
        <section>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Bambina</label>
          <BabySelector
            babies={babies}
            selected={selectedBaby}
            onChange={setSelectedBaby}
            showBoth={showBothOption}
          />
        </section>
      )}

      {/* Feeding Form */}
      {eventCategory === 'feeding' && (
        <section className="space-y-4">
          {selectedBaby === 'both' ? (
            /* Per-baby columns when both selected */
            <div className="grid grid-cols-2 gap-3">
              {babies.map((baby) => {
                const colors = BABY_COLORS[baby.short_name as keyof typeof BABY_COLORS];
                const data = perBabyData[baby.id] || { amountMl: ML_DEFAULT, hasSeno: false, hasFeci: false, hasUrine: false };
                return (
                  <div key={baby.id} className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-3 space-y-3`}>
                    <div className={`text-sm font-bold ${colors.text} text-center`}>
                      {baby.name}
                    </div>
                    <MlStepper compact value={data.amountMl} onChange={(v) => updateBabyData(baby.id, 'amountMl', v)} />
                    <BooleanToggle label="Seno" icon="🤱" value={data.hasSeno} onChange={(v) => updateBabyData(baby.id, 'hasSeno', v)} />
                    <BooleanToggle label="Feci" icon="💩" value={data.hasFeci} onChange={(v) => updateBabyData(baby.id, 'hasFeci', v)} />
                    <BooleanToggle label="Urine" icon="💦" value={data.hasUrine} onChange={(v) => updateBabyData(baby.id, 'hasUrine', v)} />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single baby layout */
            <>
              <MlStepper value={amountMl} onChange={setAmountMl} />
              <div className="space-y-2">
                <BooleanToggle label="Seno" icon="🤱" value={hasSeno} onChange={setHasSeno} />
                <BooleanToggle label="Feci" icon="💩" value={hasFeci} onChange={setHasFeci} />
                <BooleanToggle label="Urine" icon="💦" value={hasUrine} onChange={setHasUrine} />
              </div>
            </>
          )}
        </section>
      )}

      {/* Needs Form */}
      {eventCategory === 'needs' && (
        <section className="space-y-4">
          {selectedBaby === 'both' ? (
            <div className="grid grid-cols-2 gap-3">
              {babies.map((baby) => {
                const colors = BABY_COLORS[baby.short_name as keyof typeof BABY_COLORS];
                const data = perBabyData[baby.id] || { amountMl: ML_DEFAULT, hasSeno: false, hasFeci: false, hasUrine: false };
                return (
                  <div key={baby.id} className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-3 space-y-3`}>
                    <div className={`text-sm font-bold ${colors.text} text-center`}>
                      {baby.name}
                    </div>
                    <BooleanToggle label="Feci" icon="💩" value={data.hasFeci} onChange={(v) => updateBabyData(baby.id, 'hasFeci', v)} />
                    <BooleanToggle label="Urine" icon="💦" value={data.hasUrine} onChange={(v) => updateBabyData(baby.id, 'hasUrine', v)} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <BooleanToggle label="Feci" icon="💩" value={hasFeci} onChange={setHasFeci} />
              <BooleanToggle label="Urine" icon="💦" value={hasUrine} onChange={setHasUrine} />
            </div>
          )}
        </section>
      )}

      {/* Pumping Form */}
      {eventCategory === 'pumping' && (
        <section>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Quantita (ml)</label>
          <MlStepper value={amountMl} onChange={setAmountMl} />
        </section>
      )}

      {/* Weight Form */}
      {eventCategory === 'weight' && (
        <section>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Peso</label>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setWeightGrams(Math.max(0, weightGrams - 10))}
              className="w-14 h-14 rounded-full bg-gray-200 text-gray-700 text-2xl font-bold flex items-center justify-center active:bg-gray-300 transition-colors tap-target"
            >
              −
            </button>
            <div className="text-center min-w-[120px]">
              <input
                type="number"
                step="0.01"
                min="0"
                value={(weightGrams / 1000).toFixed(2)}
                onChange={(e) => {
                  const kg = parseFloat(e.target.value);
                  if (!isNaN(kg)) setWeightGrams(Math.round(kg * 1000));
                }}
                className="w-full text-4xl font-bold tabular-nums text-center bg-transparent border-b-2 border-gray-300 focus:border-blue-400 focus:outline-none"
              />
              <div className="text-sm text-gray-500">kg</div>
            </div>
            <button
              type="button"
              onClick={() => setWeightGrams(weightGrams + 10)}
              className="w-14 h-14 rounded-full bg-blue-500 text-white text-2xl font-bold flex items-center justify-center active:bg-blue-600 transition-colors tap-target"
            >
              +
            </button>
          </div>
        </section>
      )}

      {/* Notes */}
      <section>
        <label className="text-sm font-medium text-gray-500 mb-1 block">Note</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note opzionali..."
          rows={2}
          className="w-full bg-gray-100 rounded-xl px-4 py-3 text-base border-2 border-transparent focus:border-blue-300 focus:outline-none resize-none"
        />
      </section>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold active:bg-blue-700 transition-colors tap-target disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Salvataggio...' : 'Salva'}
      </button>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
