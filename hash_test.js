const bcrypt = require('bcryptjs');

async function testHash() {
  const password = 'training1';
  const hash = await bcrypt.hash(password, 12);
  console.log('Generated hash:', hash);
  
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash validates:', isValid);
  
  // Test with the hash from database
  const dbHash = '$2b$12$LQv3c1yqBwEHFAwKnzaOOeXYLZ8hT0G2UqK7eCj/YOEhXXNkHBZvy';
  const isDbValid = await bcrypt.compare(password, dbHash);
  console.log('DB hash validates:', isDbValid);
}

testHash().catch(console.error);