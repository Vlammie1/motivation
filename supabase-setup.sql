-- ============================================
-- BRUTALIST MOTIVATION TOOL - SUPABASE SETUP
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  lock_in_beat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  why TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create work_logs table
CREATE TABLE IF NOT EXISTS work_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  work_date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date)
);

-- 4. Create lock_in_sessions table
CREATE TABLE IF NOT EXISTS lock_in_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  idle_seconds INTEGER DEFAULT 0
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_in_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Tasks policies
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
CREATE POLICY "Users can manage own tasks" 
  ON tasks FOR ALL 
  USING (auth.uid() = user_id);

-- Work logs policies
DROP POLICY IF EXISTS "Users can manage own work logs" ON work_logs;
CREATE POLICY "Users can manage own work logs" 
  ON work_logs FOR ALL 
  USING (auth.uid() = user_id);

-- Lock-in sessions policies
DROP POLICY IF EXISTS "Users can manage own sessions" ON lock_in_sessions;
CREATE POLICY "Users can manage own sessions" 
  ON lock_in_sessions FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- DONE! Your database is ready to grind.
-- ============================================
