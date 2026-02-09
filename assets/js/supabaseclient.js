// assets/js/supabaseClient.js
// ЄДИНЕ місце, де зберігаються ключі Supabase

const SUPABASE_URL = 'https://bcvecityvucxdorusjnk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdmVjaXR5dnVjeGRvcnVzam5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzU4NTEsImV4cCI6MjA4NTgxMTg1MX0.W9s61SjrtcJCYdh_850CPKbBuZ_yQIfj_PypFB5MU88';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
