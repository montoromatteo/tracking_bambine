/**
 * Script to import data from neonato_log_trascritto.xlsx into Supabase.
 *
 * Usage: npx tsx scripts/import-excel.ts
 *
 * Reads the "Senza intestazioni" sheet (new 8-column format).
 * Columns: gemella | data e ora | latte artificiale | latte materno | seno | feci | urina | commenti
 */

import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const EXCEL_PATH = './neonato_log_trascritto.xlsx';
const YEAR = 2026;

interface EventInsert {
  baby_id: string | null;
  event_type: string;
  occurred_at: string;
  amount_ml: number | null;
  weight_grams: number | null;
  notes: string | null;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Load babies
  const { data: babies, error: babiesError } = await supabase.from('babies').select('*');
  if (babiesError || !babies) {
    console.error('Failed to load babies:', babiesError);
    process.exit(1);
  }

  const ameliaId = babies.find((b) => b.short_name === 'AM')?.id;
  const adeleId = babies.find((b) => b.short_name === 'AD')?.id;
  if (!ameliaId || !adeleId) {
    console.error('Could not find AM and AD babies in database. Run migrations first.');
    process.exit(1);
  }

  const babyMap: Record<string, string> = { AM: ameliaId, AD: adeleId };

  // Read Excel
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const sheet = workbook.getWorksheet('Senza intestazioni');
  if (!sheet) {
    console.error('Sheet "Senza intestazioni" not found');
    process.exit(1);
  }

  const events: EventInsert[] = [];
  let rowCount = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header row
    rowCount++;

    const gemellaRaw = String(row.getCell(1).value || '').trim();
    const dateTimeRaw = row.getCell(2).value;
    const artificialRaw = String(row.getCell(3).value || '').trim();
    const maternalRaw = String(row.getCell(4).value || '').trim();
    const senoRaw = String(row.getCell(5).value || '').trim();
    const feciRaw = String(row.getCell(6).value || '').trim();
    const urineRaw = String(row.getCell(7).value || '').trim();
    const commentiRaw = String(row.getCell(8).value || '').trim();

    // Parse date/time
    const occurredAt = parseDateTime(dateTimeRaw);
    if (!occurredAt) {
      console.warn(`  Row ${rowNumber}: Could not parse date "${dateTimeRaw}", skipping`);
      return;
    }

    // Determine baby
    const babyId = babyMap[gemellaRaw] || null;

    // Check if this is a special event (no baby, in commenti)
    const commentiLower = commentiRaw.toLowerCase();

    if (!gemellaRaw && commentiLower.includes('tirato latte')) {
      events.push({
        baby_id: null,
        event_type: 'pumping',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: commentiRaw,
      });
      return;
    }

    if (!gemellaRaw && commentiLower === 'brufen') {
      events.push({
        baby_id: null,
        event_type: 'brufen',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: null,
      });
      return;
    }

    if (!gemellaRaw && commentiLower === 'eparina') {
      events.push({
        baby_id: null,
        event_type: 'eparina',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: null,
      });
      return;
    }

    // General note row (no baby, no feeding data)
    if (!gemellaRaw && !artificialRaw && !maternalRaw && !senoRaw && !feciRaw && !urineRaw) {
      if (commentiRaw) {
        events.push({
          baby_id: null,
          event_type: 'note',
          occurred_at: occurredAt,
          amount_ml: null,
          weight_grams: null,
          notes: commentiRaw,
        });
      }
      return;
    }

    // Parse feeding: bottle = sum of artificial + maternal ml
    // Note: "x"/"✓" in artificiale column means breast feeding (misaligned data)
    const isBreastInArtificial = isBreastMarker(artificialRaw);
    const artificialMl = isBreastInArtificial ? null : parseMl(artificialRaw);
    const maternalMl = parseMl(maternalRaw);
    const totalMl = (artificialMl || 0) + (maternalMl || 0);

    if (totalMl > 0) {
      events.push({
        baby_id: babyId,
        event_type: 'feeding_bottle',
        occurred_at: occurredAt,
        amount_ml: totalMl,
        weight_grams: null,
        notes: commentiRaw || null,
      });
    }

    // Parse breast feeding (seno column OR x/✓ misplaced in artificiale column)
    if (isBreastInArtificial || isBreastMarker(senoRaw)) {
      events.push({
        baby_id: babyId,
        event_type: 'feeding_breast',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: commentiRaw || null,
      });
    }

    // Parse stool
    if (feciRaw && (feciRaw.toLowerCase() === 'x' || feciRaw === 'X')) {
      events.push({
        baby_id: babyId,
        event_type: 'stool',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: null,
      });
    }

    // Parse urine
    if (urineRaw && (urineRaw.toLowerCase() === 'x' || urineRaw === 'X')) {
      events.push({
        baby_id: babyId,
        event_type: 'urine',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: null,
      });
    }

    // Check for vitamin BK in comments
    if (babyId && commentiLower.includes('vitamine bk')) {
      events.push({
        baby_id: babyId,
        event_type: 'vitamin_bk',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: commentiRaw,
      });
    }
    // If row has a baby but no data at all, record as note
    else if (babyId && !totalMl && !senoRaw && !feciRaw && !urineRaw && commentiRaw) {
      events.push({
        baby_id: babyId,
        event_type: 'note',
        occurred_at: occurredAt,
        amount_ml: null,
        weight_grams: null,
        notes: commentiRaw,
      });
    }
  });

  console.log(`Parsed ${rowCount} rows → ${events.length} events`);

  // Count by type
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event_type] = (counts[e.event_type] || 0) + 1;
  }
  console.log('Breakdown:', counts);

  // Insert into Supabase
  if (events.length === 0) {
    console.log('No events to insert');
    return;
  }

  const { data, error } = await supabase.from('events').insert(events).select();

  if (error) {
    console.error('Insert error:', error);
    process.exit(1);
  }

  console.log(`Successfully inserted ${data.length} events`);
}

function isBreastMarker(raw: string): boolean {
  const v = raw.toLowerCase().trim();
  return v === 'x' || v === '✓';
}

function parseMl(raw: string): number | null {
  const match = raw.match(/(\d+)\s*ml/i);
  if (match) return parseInt(match[1]);
  // Handle cases like just "x" or "✓" which are breast indicators, not ml
  return null;
}

function parseDateTime(raw: unknown): string | null {
  if (!raw) return null;

  // Handle Date objects (Excel stores naive datetimes, ExcelJS reads them as UTC.
  // We need to treat them as local time instead.)
  if (raw instanceof Date) {
    const local = new Date(
      raw.getUTCFullYear(),
      raw.getUTCMonth(),
      raw.getUTCDate(),
      raw.getUTCHours(),
      raw.getUTCMinutes()
    );
    return local.toISOString();
  }

  const str = String(raw).trim();

  // Handle ISO format: "2026-04-16 17:15:00" or "2026-04-16T17:15:00"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (isoMatch) {
    const date = new Date(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]) - 1,
      parseInt(isoMatch[3]),
      parseInt(isoMatch[4]),
      parseInt(isoMatch[5])
    );
    return date.toISOString();
  }

  // Handle DD/MM HH:MM format
  const ddmmMatch = str.match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (ddmmMatch) {
    const date = new Date(
      YEAR,
      parseInt(ddmmMatch[2]) - 1,
      parseInt(ddmmMatch[1]),
      parseInt(ddmmMatch[3]),
      parseInt(ddmmMatch[4])
    );
    return date.toISOString();
  }

  return null;
}

main().catch(console.error);
