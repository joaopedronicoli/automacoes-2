import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmkbwtanvuwdfkdxtnuc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNta2J3dGFudnV3ZGZrZHh0bnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MDIyNDAsImV4cCI6MjA4NTQ3ODI0MH0.WgNun1KvlCM1cBlmPcI5ov8AaS2uZC0WbjY4MyTeWdg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
