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

test('concurrent ingest requests reuse the same job row', async (t) => {
  const { app, pool } = createTestApp();
  t.after(async () => {
    await pool.end();
  });

  const agent = request(app);
  const payloads = [
    { job_no: 'J12345', subject: 'Quote [J:12345] Request', snippet: 'First email', gmail_link: 'https://mail/1' },
    { job_no: 'J12345', subject: 'Re: Quote [J:12345] Request', snippet: 'Follow up', gmail_link: 'https://mail/2' },
  ];

  const responses = await Promise.all(
    payloads.map((body) =>
      agent.post('/activities/ingest').set('x-api-key', 'test-key').send(body),
    ),
  );

  for (const res of responses) {
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.activity?.id, 'activity should be returned');
  }

  const jobs = await pool.query('SELECT id, job_no, title FROM jobs');
  assert.equal(jobs.rowCount, 1);
  assert.equal(jobs.rows[0].job_no, 'J12345');
  assert.equal(jobs.rows[0].title, 'Quote Request');

  const activities = await pool.query('SELECT job_id, snippet FROM activities ORDER BY id');
  assert.equal(activities.rowCount, 2);
  assert.equal(activities.rows[0].job_id, jobs.rows[0].id);
  assert.equal(activities.rows[1].job_id, jobs.rows[0].id);
  assert.deepEqual(
    activities.rows.map((row) => row.snippet),
    payloads.map((payload) => payload.snippet),
  );
});
