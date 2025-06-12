#!/usr/bin/env node

console.log('🔍 Environment Variables Debug Report');
console.log('=====================================');
console.log(`📅 Date: ${new Date().toISOString()}`);
console.log(`🔧 Node Version: ${process.version}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

console.log('🗄️ Database-related environment variables:');
const dbVars = Object.keys(process.env)
  .filter(key => key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('HEROKU'))
  .sort();

if (dbVars.length > 0) {
  dbVars.forEach(key => {
    const value = process.env[key];
    // Mask sensitive parts of URLs
    const maskedValue = value && value.includes('://') 
      ? value.replace(/:\/\/[^@]+@/, '://***:***@')
      : value;
    console.log(`  ${key}: ${maskedValue || 'undefined'}`);
  });
} else {
  console.log('  No database-related environment variables found');
}

console.log('');
console.log('🔗 Database URL candidates:');
const candidates = [
  'DATABASE_URL',
  'DATABASE_DATABASE_URL', 
  'HEROKU_POSTGRESQL_DATABASE_URL'
];

candidates.forEach(key => {
  const value = process.env[key];
  const status = value ? '✅' : '❌';
  const maskedValue = value && value.includes('://') 
    ? value.replace(/:\/\/[^@]+@/, '://***:***@')
    : value || 'undefined';
  console.log(`  ${status} ${key}: ${maskedValue}`);
});

console.log('');
console.log('📊 Total environment variables:', Object.keys(process.env).length);
