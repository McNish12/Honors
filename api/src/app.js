import express from 'express';
import cors from 'cors';

function normalizeTitle(subject) {
  const cleaned = (subject || 'Untitled')
    .replace(/\[J:\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Untitled';
}

export function createApp({ pool, apiKey } = {}) {
  if (!pool) {
    throw new Error('A PostgreSQL pool is required to create the app.');
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const key = apiKey || 'change_me_secret_key';
  app.use((req, res, next) => {
    if (req.headers['x-api-key'] !== key) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
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

      const jobTitle = normalizeTitle(subject);
      const jobResult = await pool.query(
        `INSERT INTO jobs (job_no, title, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (job_no)
         DO UPDATE SET title = jobs.title
         RETURNING id`,
        [job_no, jobTitle, 'intake'],
      );
      const jobId = jobResult.rows[0].id;

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

  return app;
}

export default createApp;
