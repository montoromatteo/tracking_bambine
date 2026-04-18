'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { BabyEvent } from '@/lib/types';
import { toLocalISOString } from '@/lib/date-utils';
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '@/lib/constants';
import DateTimePicker from './DateTimePicker';
import MlStepper from './MlStepper';
import Toast from './ui/Toast';

interface EditEventModalProps {
  event: BabyEvent;
  onClose: () => void;
  onSaved: (updated: BabyEvent) => void;
}

export default function EditEventModal({ event, onClose, onSaved }: EditEventModalProps) {
  const [dateTime, setDateTime] = useState(toLocalISOString(new Date(event.occurred_at)));
  const [amountMl, setAmountMl] = useState(event.amount_ml ?? 0);
  const [weightGrams, setWeightGrams] = useState(event.weight_grams ?? 0);
  const [notes, setNotes] = useState(event.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const hasMl = event.event_type === 'feeding_bottle' || event.event_type === 'pumping';
  const hasWeight = event.event_type === 'weight';

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const occurredAt = new Date(dateTime).toISOString();

      const updates: Partial<BabyEvent> = {
        occurred_at: occurredAt,
        notes: notes.trim() ? notes.trim() : null,
      };
      if (hasMl) updates.amount_ml = amountMl;
      if (hasWeight) updates.weight_grams = weightGrams;

      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id)
        .select('*, baby:babies(*)')
        .single();

      if (error) throw error;

      setToast({ message: 'Aggiornato!', type: 'success' });
      setTimeout(() => {
        onSaved(data as BabyEvent);
        onClose();
      }, 400);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Errore nel salvataggio', type: 'error' });
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span>{EVENT_TYPE_ICONS[event.event_type]}</span>
            Modifica {EVENT_TYPE_LABELS[event.event_type]}
            {event.baby && (
              <span className="text-sm font-normal text-gray-500">
                · {event.baby.name}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2 tap-target"
          >
            ×
          </button>
        </div>

        <section>
          <label className="text-sm font-medium text-gray-500 mb-1 block">Quando</label>
          <DateTimePicker value={dateTime} onChange={setDateTime} />
        </section>

        {hasMl && (
          <section>
            <label className="text-sm font-medium text-gray-500 mb-1 block">Quantita (ml)</label>
            <MlStepper value={amountMl} onChange={setAmountMl} />
          </section>
        )}

        {hasWeight && (
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

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold active:bg-gray-200 transition-colors tap-target"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold active:bg-blue-700 transition-colors tap-target disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </div>
  );
}
