import dotenv from 'dotenv';
import pkg from 'pg';
import { createApp } from './app.js';

const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const app = createApp({
  pool,
  apiKey: process.env.API_KEY,
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`API on :${port}`);
});
