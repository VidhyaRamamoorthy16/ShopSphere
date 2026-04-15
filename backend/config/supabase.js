const { createClient } = require("@supabase/supabase-js");

// Load the client using environment variables for safety and flexibility
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Missing SUPABASE environment variables in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;