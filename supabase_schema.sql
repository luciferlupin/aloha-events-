-- ====================================================
-- ALOAH EVENTS - COMPLETE SUPABASE DATABASE SCHEMA
-- ====================================================
-- This file configures the complete database schema for the Aloah Events PWA
-- including user profiles linked to Supabase Auth, events registry, guests lists,
-- checklist tasks, client-side financials, CRMs, audit logs, and document vaults.
--
-- Instructions:
-- Run this SQL in your Supabase Project's SQL Editor (https://supabase.com/dashboard/project/YOUR-PROJECT/sql).

-- ----------------------------------------------------
-- 1. ENUMS & ENUM TYPE SETUPS
-- ----------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
    CREATE TYPE employee_role AS ENUM ('Admin', 'Event Manager', 'Finance Team');
  END IF;
END $$;

-- ----------------------------------------------------
-- 2. PUBLIC PROFILES TABLE
-- ----------------------------------------------------
-- Stores public information, permissions, and roles for employees.
-- Linked 1-to-1 with Supabase Auth (auth.users).
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role employee_role NOT NULL DEFAULT 'Event Manager',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 3. EVENTS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  venue TEXT NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  budget TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning', 'Confirmed', 'Live', 'Completed', 'Cancelled')),
  assigned_team UUID[] DEFAULT '{}',
  vendors UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 4. GUESTS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  rsvp_status TEXT NOT NULL DEFAULT 'Pending' CHECK (rsvp_status IN ('Pending', 'Confirmed', 'Declined')),
  check_in_status TEXT NOT NULL DEFAULT 'Pending' CHECK (check_in_status IN ('Pending', 'Checked In')),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('VVIP', 'VIP', 'Media', 'General')),
  attendees_count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 5. TASKS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT, -- Stores name or user profile link
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 6. CLIENTS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  total_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 7. VENDORS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold')),
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 8. FINANCES LEDGER TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 9. EVENT TIMELINES MILESTONES TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 10. DOCUMENTS VAULT TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'xlsx', 'png')),
  size TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 11. AUDIT ACTIVITY LOGS TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  operator TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES DEFINITIONS
-- ====================================================
-- By default, all authenticated crew members can SELECT rows from tables.
-- Write permissions are limited to Admins and Event Managers.

DROP POLICY IF EXISTS "Allow selecting profiles" ON public.profiles;
CREATE POLICY "Allow selecting profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow Admin writing profiles" ON public.profiles;
CREATE POLICY "Allow Admin writing profiles" ON public.profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

DROP POLICY IF EXISTS "Allow selecting events" ON public.events;
CREATE POLICY "Allow selecting events" ON public.events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow Admin/Manager writing events" ON public.events;
CREATE POLICY "Allow Admin/Manager writing events" ON public.events FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Event Manager'))
);

DROP POLICY IF EXISTS "Allow selecting guests" ON public.guests;
CREATE POLICY "Allow selecting guests" ON public.guests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow Admin/Manager writing guests" ON public.guests;
CREATE POLICY "Allow Admin/Manager writing guests" ON public.guests FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Event Manager'))
);

DROP POLICY IF EXISTS "Allow selecting tasks" ON public.tasks;
CREATE POLICY "Allow selecting tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow Admin/Manager/Ops writing tasks" ON public.tasks;
CREATE POLICY "Allow Admin/Manager/Ops writing tasks" ON public.tasks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Event Manager'))
);

DROP POLICY IF EXISTS "Allow selecting clients" ON public.clients;
CREATE POLICY "Allow selecting clients" ON public.clients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow Admin writing clients" ON public.clients;
CREATE POLICY "Allow Admin writing clients" ON public.clients FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

DROP POLICY IF EXISTS "Allow selecting vendors" ON public.vendors;
CREATE POLICY "Allow selecting vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow Admin writing vendors" ON public.vendors;
CREATE POLICY "Allow Admin writing vendors" ON public.vendors FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

DROP POLICY IF EXISTS "Allow selecting finances" ON public.finances;
CREATE POLICY "Allow selecting finances" ON public.finances FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Finance Team'))
);
DROP POLICY IF EXISTS "Allow Admin/Finance writing finances" ON public.finances;
CREATE POLICY "Allow Admin/Finance writing finances" ON public.finances FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Finance Team'))
);

DROP POLICY IF EXISTS "Allow selecting timelines" ON public.timelines;
CREATE POLICY "Allow selecting timelines" ON public.timelines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow Admin/Manager writing timelines" ON public.timelines;
CREATE POLICY "Allow Admin/Manager writing timelines" ON public.timelines FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Event Manager'))
);

DROP POLICY IF EXISTS "Allow selecting documents" ON public.documents;
CREATE POLICY "Allow selecting documents" ON public.documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated writing documents" ON public.documents;
CREATE POLICY "Allow authenticated writing documents" ON public.documents FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow selecting activity logs" ON public.activity_logs;
CREATE POLICY "Allow selecting activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow system writing activity logs" ON public.activity_logs;
CREATE POLICY "Allow system writing activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ----------------------------------------------------
-- 12. AUTOMATED USER INSERTS TRIGGER
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    COALESCE((new.raw_user_meta_data->>'role')::public.employee_role, 'Event Manager'::public.employee_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------
-- 13. DATA SEED INSTRUCTIONS & OPTIONAL INSERTS
-- ----------------------------------------------------
-- Once auth profiles are linked, you can manually override roles in SQL editor:
--
-- UPDATE public.profiles SET role = 'Admin' WHERE email = 'jaigoel2206@gmail.com';
-- UPDATE public.profiles SET role = 'Event Manager' WHERE email = 'rohan@aloahevents.com';
-- UPDATE public.profiles SET role = 'Finance Team' WHERE email = 'rajesh@aloahevents.com';
