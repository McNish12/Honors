import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const API_KEY = process.env.API_KEY || 'change_me_secret_key';
app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
});

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/jobs', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    const where = status ? (params.push(status), 'WHERE status = $1') : '';
    const { rows } = await pool.query(
      `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT 200`,
      params,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/jobs', async (req, res, next) => {
  try {
    const {
      job_no,
      title,
      status = 'intake',
      in_hands_date,
      owner,
      priority,
      est_so_no,
    } = req.body || {};
    if (!job_no || !title) {
      return res.status(400).json({ error: 'job_no and title required' });
    }
    const query = `INSERT INTO jobs (job_no,title,status,in_hands_date,owner,priority,est_so_no)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    const values = [
      job_no,
      title,
      status,
      in_hands_date || null,
      owner || null,
      priority || null,
      est_so_no || null,
    ];
    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.post('/activities/ingest', async (req, res, next) => {
  try {
    const { job_no, subject, snippet, gmail_link, source = 'email' } = req.body || {};
    if (!job_no) {
      return res.status(400).json({ error: 'job_no required' });
    }
    const found = await pool.query('SELECT id FROM jobs WHERE job_no=$1 LIMIT 1', [job_no]);
    const jobId = found.rowCount
      ? found.rows[0].id
      : (
          await pool.query(
            'INSERT INTO jobs (job_no,title,status) VALUES ($1,$2,$3) RETURNING id',
            [job_no, (subject || 'Untitled').replace(/\[J:\d+\]/g, '').trim(), 'intake'],
          )
        ).rows[0].id;
    const activity = await pool.query(
      'INSERT INTO activities (job_id,source,snippet,gmail_link) VALUES ($1,$2,$3,$4) RETURNING *',
      [jobId, source, snippet || null, gmail_link || null],
    );
    res.json({ ok: true, activity: activity.rows[0] });
  } catch (err) {
    next(err);
  }
});

app.patch('/jobs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, in_hands_date } = req.body || {};
    const sets = [];
    const values = [];
    let i = 1;
    if (status) {
      sets.push(`status=$${i++}`);
      values.push(status);
    }
    if (in_hands_date) {
      sets.push(`in_hands_date=$${i++}`);
      values.push(in_hands_date);
    }
    if (!sets.length) {
      return res.status(400).json({ error: 'no changes' });
    }
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE jobs SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`,
      values,
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`API on :${port}`);
});
