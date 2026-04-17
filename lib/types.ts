export type EventType =
  | 'feeding_bottle'
  | 'feeding_breast'
  | 'pumping'
  | 'stool'
  | 'urine'
  | 'weight'
  | 'note'
  | 'brufen'
  | 'eparina'
  | 'vitamin_bk';

export interface Baby {
  id: string;
  name: string;
  short_name: string;
  created_at: string;
}

export interface BabyEvent {
  id: string;
  baby_id: string | null;
  event_type: EventType;
  occurred_at: string;
  amount_ml: number | null;
  weight_grams: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined field
  baby?: Baby;
}

export interface DailySummary {
  date: string;
  baby_id: string;
  baby_name: string;
  total_ml: number;
  feeding_count: number;
  breast_count: number;
  bottle_count: number;
  stool_count: number;
  urine_count: number;
  last_feeding_at: string | null;
}

export interface ChartDataPoint {
  date: string;
  amelia_ml: number;
  adele_ml: number;
}

export interface FrequencyDataPoint {
  date: string;
  amelia_count: number;
  adele_count: number;
}

export interface WeightDataPoint {
  date: string;
  amelia_grams: number | null;
  adele_grams: number | null;
}
