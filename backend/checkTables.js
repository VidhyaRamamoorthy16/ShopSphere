require('dotenv').config();
const supabase = require('./config/supabase');

async function checkTables() {
  console.log('Checking tables...');
  
  // Check products
  const { data: products, error: pError } = await supabase.from('products').select('*').limit(1);
  if (pError) console.error('Products table error:', pError.message);
  else console.log('Products table exists.');

  // Check cart
  const { data: cart, error: cError } = await supabase.from('cart').select('*').limit(1);
  if (cError) console.error('Cart table error:', cError.message);
  else console.log('Cart table exists.');

  // Check users (auth is internal, but if there's a profiles/users table)
  const { data: users, error: uError } = await supabase.from('users').select('*').limit(1);
  if (uError) console.error('Users table error:', uError.message);
  else console.log('Users table exists.');
}

checkTables();
