-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  academic_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic Levels
CREATE TABLE academic_levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Subjects/Topics
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  level_id INTEGER REFERENCES academic_levels(id),
  description TEXT,
  UNIQUE(slug, level_id)
);

-- Experiments
CREATE TABLE experiments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  subject_id INTEGER REFERENCES subjects(id),
  description TEXT,
  docker_image TEXT NOT NULL,
  port INTEGER NOT NULL,
  UNIQUE(slug, subject_id)
);

-- Insert initial data
INSERT INTO academic_levels (name, slug, description) VALUES
  ('Primary', 'primary', 'Primary School Level'),
  ('O-Level', 'o-level', 'Ordinary Level'),
  ('A-Level', 'a-level', 'Advanced Level');

-- Insert subjects
INSERT INTO subjects (name, slug, level_id, description) VALUES
  ('Integrated Science', 'integrated-science', 1, 'Primary Science'),
  ('Physics', 'physics', 2, 'O-Level Physics'),
  ('Chemistry', 'chemistry', 2, 'O-Level Chemistry'),
  ('Biology', 'biology', 2, 'O-Level Biology'),
  ('Physics', 'physics', 3, 'A-Level Physics'),
  ('Chemistry', 'chemistry', 3, 'A-Level Chemistry'),
  ('Biology', 'biology', 3, 'A-Level Biology');

-- Insert sample experiments
INSERT INTO experiments (title, slug, subject_id, description, docker_image, port) VALUES
  ('Ohm''s Law', 'ohms-law', 2, 'Experiment to verify Ohm''s Law', 'ilab-physics-ohms-law', 3001),
  ('Acid-Base Titration', 'acid-base-titration', 3, 'Titration experiment', 'ilab-chemistry-titration', 3002);