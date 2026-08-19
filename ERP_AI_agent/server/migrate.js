import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const DB_NAME = process.env.DB_NAME || 'erp_agent';
const __dir   = dirname(fileURLToPath(import.meta.url));

async function getConn() {
  return mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INT          AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(200) NOT NULL UNIQUE,
      applied_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getApplied(conn) {
  const [rows] = await conn.query('SELECT name FROM _migrations ORDER BY id');
  return new Set(rows.map(r => r.name));
}

async function runMigrations() {
  const conn = await getConn();
  await ensureMigrationsTable(conn);
  const applied = await getApplied(conn);

  const files = (await readdir(join(__dir, 'migrations')))
    .filter(f => f.endsWith('.js'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const mod = await import(pathToFileURL(join(__dir, 'migrations', file)).href);
    console.log(`  ▶ applying: ${file}`);
    await mod.up(conn);
    await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
    console.log(`  ✓ done:     ${file}`);
    count++;
  }

  if (count === 0) console.log('  ✓ 所有 migration 已是最新版本');
  else console.log(`✅ 共套用 ${count} 個 migration`);
  await conn.end();
}

runMigrations().catch(err => { console.error(err); process.exit(1); });
