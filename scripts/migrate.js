#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
  constructor() {
    this.pool = null;
    this.migrationPath = path.join(__dirname, '..', 'migrations', 'init.sql');
  }

  async initialize() {
    console.log('🚀 Starting NLOMS Database Migration...');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`🔧 Node Version: ${process.version}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check for various possible database URL environment variables
    const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_DATABASE_URL || process.env.HEROKU_POSTGRESQL_DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ ERROR: No database URL environment variable found');
      console.error('   Checked: DATABASE_URL, DATABASE_DATABASE_URL, HEROKU_POSTGRESQL_DATABASE_URL');
      console.error('   Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')).join(', ') || 'none');
      process.exit(1);
    }

    console.log('🔗 Database URL found, initializing connection...');
    
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
      max: 10
    });
  }

  async testConnection() {
    try {
      console.log('🔍 Testing database connection...');
      const result = await this.pool.query('SELECT NOW() as current_time, version() as db_version');
      console.log('✅ Database connection successful');
      console.log(`🕐 Server Time: ${result.rows[0].current_time}`);
      console.log(`🗄️  Database Version: ${result.rows[0].db_version.split(',')[0]}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async checkExistingTables() {
    try {
      console.log('🔍 Checking existing database structure...');
      const result = await this.pool.query(`
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

      if (result.rows.length > 0) {
        console.log(`📋 Found ${result.rows.length} existing tables:`);
        result.rows.forEach(row => {
          console.log(`   - ${row.table_name} (${row.table_type})`);
        });
        
        // Check if main tables exist
        const tableNames = result.rows.map(row => row.table_name);
        const requiredTables = ['users', 'land_parcels', 'land_registrations', 'certificates'];
        const missingTables = requiredTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length === 0) {
          console.log('✅ All required tables already exist');
          return true;
        } else {
          console.log(`⚠️  Missing tables: ${missingTables.join(', ')}`);
          return false;
        }
      } else {
        console.log('📋 No tables found - fresh database detected');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking existing tables:', error.message);
      throw error;
    }
  }

  async runMigration() {
    try {
      console.log('📖 Reading migration file...');
      
      if (!fs.existsSync(this.migrationPath)) {
        throw new Error(`Migration file not found at: ${this.migrationPath}`);
      }

      const migrationSQL = fs.readFileSync(this.migrationPath, 'utf8');
      console.log(`📄 Migration file loaded (${migrationSQL.length} characters)`);

      console.log('⚡ Executing database migration...');
      console.log('⏳ This may take a few moments...');

      try {
        // Execute the entire migration as one transaction for better reliability
        console.log('🔄 Executing migration script...');
        await this.pool.query(migrationSQL);
        console.log('✅ Migration executed successfully');

      } catch (error) {
        console.error('❌ Migration execution failed:', error.message);
        console.error('🔍 Error details:', error.detail || 'No additional details');
        console.error('💡 Hint:', error.hint || 'No hints available');
        throw error;
      }

    } catch (error) {
      console.error('❌ Migration execution failed:', error.message);
      throw error;
    }
  }

  async verifyMigration() {
    try {
      console.log('🔍 Verifying migration results...');

      // Check tables
      const tablesResult = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

      console.log(`✅ Created ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });

      // Check indexes
      const indexesResult = await this.pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        ORDER BY indexname
      `);

      console.log(`🗂️  Created ${indexesResult.rows.length} indexes`);

      // Check functions
      const functionsResult = await this.pool.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        ORDER BY routine_name
      `);

      console.log(`⚙️  Created ${functionsResult.rows.length} functions`);

      // Check default admin user
      const adminResult = await this.pool.query(`
        SELECT user_id, email, role 
        FROM users 
        WHERE role = 'admin' 
        LIMIT 1
      `);

      if (adminResult.rows.length > 0) {
        console.log(`👤 Default admin user created: ${adminResult.rows[0].email}`);
      }

      console.log('✅ Migration verification completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Migration verification failed:', error.message);
      throw error;
    }
  }

  async cleanup() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      await this.initialize();
      await this.testConnection();
      
      const tablesExist = await this.checkExistingTables();
      
      if (tablesExist) {
        console.log('🎉 Database is already migrated and ready to use!');
      } else {
        await this.runMigration();
        await this.verifyMigration();
        console.log('🎉 Database migration completed successfully!');
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`⏱️  Total migration time: ${duration} seconds`);
      console.log('🚀 NLOMS Backend is ready for deployment!');

    } catch (error) {
      console.error('\n💥 MIGRATION FAILED:');
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.run();
}

module.exports = DatabaseMigrator;