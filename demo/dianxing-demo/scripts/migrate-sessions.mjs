/**
 * 直接执行SQL创建decisionSessions表
 * 使用方式: node scripts/migrate-sessions.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(url);

try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`decisionSessions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int,
      \`dilemma\` text NOT NULL,
      \`clarifyQuestion\` text,
      \`clarifyAnswer\` text,
      \`answers\` text NOT NULL,
      \`awakeningQuote\` text,
      \`analysis\` text,
      \`tendency\` text,
      \`actionAdvice\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`decisionSessions_id\` PRIMARY KEY(\`id\`)
    )
  `);
  console.log('✅ decisionSessions table created (or already exists)');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
