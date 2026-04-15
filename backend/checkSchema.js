require('dotenv').config();
const supabase = require('./config/supabase');

async function checkSchema() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('Error fetching products:', error);
  } else {
    console.log('Sample Product:', JSON.stringify(data[0], null, 2));
  }
}

checkSchema();
