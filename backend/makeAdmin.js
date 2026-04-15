require('dotenv').config();
const supabase = require('./config/supabase');

/**
 * Utility script to promote a user to 'admin' role by email
 * Usage: node makeAdmin.js your-email@example.com
 */

const promoteUser = async () => {
  const email = process.argv[2];

  if (!email) {
    console.error("Please provide an email: node makeAdmin.js user@example.com");
    process.exit(1);
  }

  console.log(`Promoting user ${email} to admin...`);

  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('email', email)
    .select();

  if (error) {
    console.error("Error promoting user:", error.message);
    process.exit(1);
  }

  if (data.length === 0) {
    console.error("User not found.");
    process.exit(1);
  }

  console.log("Success! User promoted to admin.");
  console.table(data);
};

promoteUser();
