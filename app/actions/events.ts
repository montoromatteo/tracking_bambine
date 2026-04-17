'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { EventType } from '@/lib/types';
import { revalidatePath } from 'next/cache';

interface CreateEventInput {
  baby_id: string | null;
  event_type: EventType;
  occurred_at: string;
  amount_ml?: number | null;
  weight_grams?: number | null;
  notes?: string | null;
}

export async function createEvent(input: CreateEventInput) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .insert({
      baby_id: input.baby_id,
      event_type: input.event_type,
      occurred_at: input.occurred_at,
      amount_ml: input.amount_ml || null,
      weight_grams: input.weight_grams || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/storico');
  return data;
}

export async function createEvents(inputs: CreateEventInput[]) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .insert(
      inputs.map((input) => ({
        baby_id: input.baby_id,
        event_type: input.event_type,
        occurred_at: input.occurred_at,
        amount_ml: input.amount_ml || null,
        weight_grams: input.weight_grams || null,
        notes: input.notes || null,
      }))
    )
    .select();

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/storico');
  return data;
}

export async function deleteEvent(id: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/storico');
}

export async function getEvents(filters?: {
  baby_id?: string;
  event_type?: EventType;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('events')
    .select('*, baby:babies(*)')
    .order('occurred_at', { ascending: false });

  if (filters?.baby_id) {
    query = query.eq('baby_id', filters.baby_id);
  }
  if (filters?.event_type) {
    query = query.eq('event_type', filters.event_type);
  }
  if (filters?.date_from) {
    query = query.gte('occurred_at', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('occurred_at', filters.date_to);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getBabies() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('babies')
    .select('*')
    .order('short_name');

  if (error) throw new Error(error.message);
  return data;
}
