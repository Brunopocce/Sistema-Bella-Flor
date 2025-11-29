import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://actrkhcablavfgmwjnnj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdHJraGNhYmxhdmZnbXdqbm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODA3ODksImV4cCI6MjA3OTk1Njc4OX0.iULK7_5tTHAsYJ_1zOxWG3cgk2dvbJfBMpKVVoz6yhU';

// Validação das credenciais
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
