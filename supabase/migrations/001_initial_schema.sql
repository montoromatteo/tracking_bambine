-- Babies lookup table
CREATE TABLE babies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO babies (name, short_name) VALUES ('Amelia', 'AM'), ('Adele', 'AD');

-- Event types enum
CREATE TYPE event_type AS ENUM (
  'feeding_bottle',
  'feeding_breast',
  'pumping',
  'stool',
  'urine',
  'weight',
  'note'
);

-- Main events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID REFERENCES babies(id),
  event_type event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  amount_ml INTEGER,
  weight_grams INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_events_occurred_at ON events(occurred_at DESC);
CREATE INDEX idx_events_baby_date ON events(baby_id, occurred_at DESC);
CREATE INDEX idx_events_type ON events(event_type);
