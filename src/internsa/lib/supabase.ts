import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bcrmuekijbhsyvlgxmcz.supabase.co';
// WARNING: In a production environment, use environment variables for the Anon Key.
// For now, I am using a placeholder. You will need to provide the actual Anon Key from your Supabase dashboard.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcm11ZWtpamJoc3l2bGd4bWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDc5OTAsImV4cCI6MjEwODE4Mzk5MH0.HcXoTjNmokua1PYnHyEhiB6WnBMvNhV3p1i1T_btrnA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
