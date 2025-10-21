import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Use Replit PostgreSQL database
// Note: DigitalOcean ai-memory database requires VPC access and cannot be reached from Replit
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL not configured');
}

console.log('Connected to database: Replit PostgreSQL (with Google Sheets backup)');

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
