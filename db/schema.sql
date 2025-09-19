create table if not exists companies (
  id bigserial primary key,
  name text not null,
  email_domain text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id bigserial primary key,
  company_id bigint references companies(id) on delete set null,
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id bigserial primary key,
  job_no text not null,
  company_id bigint references companies(id) on delete set null,
  title text not null,
  status text default 'intake',
  in_hands_date date,
  owner text,
  priority text,
  est_so_no text,
  created_at timestamptz default now()
);

create unique index if not exists jobs_job_no_key on jobs(job_no);

create table if not exists activities (
  id bigserial primary key,
  job_id bigint not null references jobs(id) on delete cascade,
  source text default 'email',
  snippet text,
  gmail_link text,
  created_at timestamptz default now(),
  created_by text
);

create table if not exists line_items (
  id bigserial primary key,
  job_id bigint not null references jobs(id) on delete cascade,
  description text not null,
  quantity numeric,
  unit_price numeric,
  created_at timestamptz default now()
);

create table if not exists attachments (
  id bigserial primary key,
  job_id bigint not null references jobs(id) on delete cascade,
  file_name text,
  file_url text,
  uploaded_at timestamptz default now()
);
