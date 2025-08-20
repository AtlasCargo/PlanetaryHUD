-- Supabase Database Schema for Ideologram
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create tables for Ideologram data

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ideologram Library table
CREATE TABLE IF NOT EXISTS ideologram_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  books JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Ideologram Enriched data table
CREATE TABLE IF NOT EXISTS ideologram_enriched (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Ideologram Scores table
CREATE TABLE IF NOT EXISTS ideologram_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Ideologram Assessments table
CREATE TABLE IF NOT EXISTS ideologram_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Ideologram Chat History table
CREATE TABLE IF NOT EXISTS ideologram_chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideologram_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideologram_enriched ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideologram_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideologram_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideologram_chat_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Ideologram Library policies
CREATE POLICY "Users can view own library" ON ideologram_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own library" ON ideologram_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own library" ON ideologram_library
  FOR UPDATE USING (auth.uid() = user_id);

-- Ideologram Enriched policies
CREATE POLICY "Users can view own enriched data" ON ideologram_enriched
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enriched data" ON ideologram_enriched
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enriched data" ON ideologram_enriched
  FOR UPDATE USING (auth.uid() = user_id);

-- Ideologram Scores policies
CREATE POLICY "Users can view own scores" ON ideologram_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scores" ON ideologram_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scores" ON ideologram_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- Ideologram Assessments policies
CREATE POLICY "Users can view own assessments" ON ideologram_assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments" ON ideologram_assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments" ON ideologram_assessments
  FOR UPDATE USING (auth.uid() = user_id);

-- Ideologram Chat History policies
CREATE POLICY "Users can view own chat history" ON ideologram_chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat history" ON ideologram_chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat history" ON ideologram_chat_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ideologram_library_user_id ON ideologram_library(user_id);
CREATE INDEX IF NOT EXISTS idx_ideologram_enriched_user_id ON ideologram_enriched(user_id);
CREATE INDEX IF NOT EXISTS idx_ideologram_scores_user_id ON ideologram_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_ideologram_assessments_user_id ON ideologram_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_ideologram_chat_history_user_id ON ideologram_chat_history(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideologram_library_updated_at BEFORE UPDATE ON ideologram_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideologram_enriched_updated_at BEFORE UPDATE ON ideologram_enriched
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideologram_scores_updated_at BEFORE UPDATE ON ideologram_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideologram_assessments_updated_at BEFORE UPDATE ON ideologram_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideologram_chat_history_updated_at BEFORE UPDATE ON ideologram_chat_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
