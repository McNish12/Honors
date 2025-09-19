import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { newDb } from 'pg-mem';
import request from 'supertest';
import { createApp } from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');

function createTestApp() {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.none(schemaSql);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const app = createApp({ pool, apiKey: 'test-key' });
  return { app, pool };
}

test('PATCH /jobs/:id clears in_hands_date when null', async (t) => {
  const { app, pool } = createTestApp();
  t.after(async () => {
    await pool.end();
  });

  const jobResult = await pool.query(
    'INSERT INTO jobs (job_no, title, status, in_hands_date) VALUES ($1,$2,$3,$4) RETURNING id',
    ['J98765', 'Test Job', 'intake', '2024-01-15'],
  );
  const jobId = jobResult.rows[0].id;

  const res = await request(app)
    .patch(`/jobs/${jobId}`)
    .set('x-api-key', 'test-key')
    .send({ in_hands_date: null });

  assert.equal(res.status, 200);
  assert.equal(res.body.in_hands_date, null);

  const job = await pool.query('SELECT in_hands_date FROM jobs WHERE id=$1', [jobId]);
  assert.equal(job.rowCount, 1);
  assert.equal(job.rows[0].in_hands_date, null);
});
