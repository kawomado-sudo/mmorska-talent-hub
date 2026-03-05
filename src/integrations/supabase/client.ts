import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://opdpjplccytlzadjpdsd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZHBqcGxjY3l0bHphZGpwZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDMwMTIsImV4cCI6MjA3Njg3OTAxMn0.-E7lNQ_tMRPg7ImwNgJIJa1WSUZOJLp_glmWtFix7VE";

// Klient HR — dla tabel hr.*
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'hr' },
});

// Klient Core — dla tabel core.* i public.*
export const supabaseCore = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
});
