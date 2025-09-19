import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Copy,
  ExternalLink,
  FolderOpen,
  Mail,
  RefreshCcw,
} from 'lucide-react';
import './App.css';

const statusColumns = [
  { key: 'intake', label: 'Intake' },
  { key: 'design', label: 'Design' },
  { key: 'proof', label: 'Proof' },
  { key: 'production', label: 'Production' },
  { key: 'complete', label: 'Complete' },
];

const CURRENT_USER = (import.meta.env.VITE_CURRENT_USER || 'ops@ownops.test').toLowerCase();
const API_BASE = import.meta.env.VITE_API_BASE;
const API_KEY = import.meta.env.VITE_API_KEY;

const mockJobs = [
  {
    id: 1,
    job_no: '70021',
    title: 'Weathergard Lobby Refresh',
    status: 'intake',
    in_hands_date: '2024-08-12',
    owner: 'ops@ownops.test',
    priority: 'High',
    est_so_no: 'SO-1440',
    gmail_link: 'https://mail.google.com/mail/u/0/#all/18d746bca3aa11d7',
    snippet: 'Kickoff call recap and next steps with client.',
    folder_path: '\\HONORS-SERVER\\Client\\70021 - Weathergard\\',
  },
  {
    id: 2,
    job_no: '70058',
    title: 'City Works Menu Boards',
    status: 'design',
    in_hands_date: '2024-08-05',
    owner: 'jordan@ownops.test',
    priority: 'Medium',
    est_so_no: 'SO-1501',
    gmail_link: 'https://mail.google.com/mail/u/0/#all/189c157d0cf12fd1',
    snippet: 'Art files received, awaiting proof approval.',
    folder_path: '\\HONORS-SERVER\\Client\\70058 - City Works\\',
  },
  {
    id: 3,
    job_no: '70077',
    title: 'Northwind Fleet Wrap',
    status: 'production',
    in_hands_date: '2024-08-18',
    owner: 'ops@ownops.test',
    priority: 'Hot',
    est_so_no: 'SO-1519',
    gmail_link: 'https://mail.google.com/mail/u/0/#all/18bd01f205afa381',
    snippet: 'Vendor confirmed install window. Materials inbound.',
    folder_path: '\\HONORS-SERVER\\Client\\70077 - Northwind\\',
  },
];

function normalizeJob(job, index = 0) {
  const folder =
    job.folder_path ||
    `\\\\HONORS-SERVER\\Client\\${job.job_no || 'JOB'} - ${job.title || 'Project'}\\`;
  return {
    ...job,
    id: job.id || index + 1,
    status: job.status || 'intake',
    owner: job.owner || '',
    in_hands_date: job.in_hands_date || null,
    gmail_link: job.gmail_link || '',
    snippet: job.snippet || '',
    folder_path: folder,
  };
}

function getDaysForMonth(activeDate) {
  const start = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
  const end = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0);
  const startOffset = start.getDay();
  const totalDays = end.getDate();
  const cells = [];
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;
  for (let i = 0; i < totalCells; i += 1) {
    const date = new Date(start);
    date.setDate(i - startOffset + 1);
    const inMonth = i >= startOffset && i < startOffset + totalDays;
    cells.push({
      key: `${date.toISOString()}-${i}`,
      date,
      inMonth,
      day: date.getDate(),
    });
  }
  return cells;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function App() {
  const [jobs, setJobs] = useState(mockJobs.map((job, idx) => normalizeJob(job, idx)));
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || null);
  const [filterMode, setFilterMode] = useState('mine');
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [draggedJob, setDraggedJob] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!API_BASE) return undefined;
    let cancelled = false;
    const fetchJobs = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE}/jobs`, {
          headers: API_KEY ? { 'x-api-key': API_KEY } : undefined,
        });
        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload)) {
          const hydrated = payload.map((job, idx) => normalizeJob(job, idx));
          setJobs(hydrated.length ? hydrated : mockJobs);
          if (hydrated.length) {
            setSelectedJobId(hydrated[0].id);
          }
        }
      } catch (err) {
        console.warn('Falling back to mock jobs:', err);
        if (!cancelled) {
          setError('Unable to load jobs from the API. Showing local mock data.');
          setJobs(mockJobs.map((job, idx) => normalizeJob(job, idx)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    if (filterMode === 'all') return jobs;
    return jobs.filter((job) => job.owner?.toLowerCase() === CURRENT_USER);
  }, [jobs, filterMode]);

  const jobsByStatus = useMemo(() => {
    return filteredJobs.reduce((acc, job) => {
      const bucket = job.status || 'intake';
      if (!acc[bucket]) acc[bucket] = [];
      acc[bucket].push(job);
      return acc;
    }, {});
  }, [filteredJobs]);

  const calendarCells = useMemo(() => getDaysForMonth(activeMonth), [activeMonth]);

  const jobsByDate = useMemo(() => {
    return filteredJobs.reduce((acc, job) => {
      if (!job.in_hands_date) return acc;
      const dateKey = job.in_hands_date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(job);
      return acc;
    }, {});
  }, [filteredJobs]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;

  const handleStatusChange = async (job, nextStatus) => {
    const updatedJobs = jobs.map((item) =>
      item.id === job.id
        ? {
            ...item,
            status: nextStatus,
          }
        : item,
    );
    setJobs(updatedJobs);
    try {
      if (!API_BASE || !API_KEY) return;
      const response = await fetch(`${API_BASE}/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update job ${job.id}`);
      }
    } catch (err) {
      console.error(err);
      setActionMessage('Could not sync with the API. Status updated locally.');
    }
  };

  const handleDragStart = (job) => {
    setDraggedJob(job);
  };

  const handleDrop = (statusKey) => {
    if (!draggedJob) return;
    handleStatusChange(draggedJob, statusKey);
    setDraggedJob(null);
  };

  const handleCopyLink = async (link) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setActionMessage('Copied Gmail link to clipboard.');
    } catch (error) {
      console.error(error);
      setActionMessage('Clipboard copy failed.');
    }
  };

  const handleOpenFolder = async (path) => {
    if (!path) return;
    try {
      await fetch(`http://localhost:5210/open?path=${encodeURIComponent(path)}`);
      setActionMessage('Told the helper to open the folder.');
    } catch (error) {
      console.error(error);
      setActionMessage('Unable to reach the folder helper.');
    }
  };

  const goToPrevMonth = () => {
    setActiveMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setActiveMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const refreshFromApi = async () => {
    if (!API_BASE) {
      setActionMessage('Set VITE_API_BASE to enable live refresh.');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/jobs`, {
        headers: API_KEY ? { 'x-api-key': API_KEY } : undefined,
      });
      if (!response.ok) throw new Error('Refresh failed');
      const data = await response.json();
      const normalized = data.map((job, idx) => normalizeJob(job, idx));
      setJobs(normalized);
      setSelectedJobId(normalized[0]?.id || null);
      setActionMessage('Jobs refreshed from the API.');
    } catch (error) {
      console.error(error);
      setActionMessage('Could not refresh from the API.');
    } finally {
      setLoading(false);
    }
  };

  const renderJobCard = (job) => (
    <div
      key={job.id}
      className={`job-card${job.id === selectedJobId ? ' selected' : ''}`}
      draggable
      onDragStart={() => handleDragStart(job)}
      onClick={() => setSelectedJobId(job.id)}
    >
      <div className="job-card-header">
        <span className="job-no">J:{job.job_no}</span>
        <span className={`priority priority-${(job.priority || 'normal').toLowerCase()}`}>
          {job.priority || 'Normal'}
        </span>
      </div>
      <div className="job-title">{job.title}</div>
      <div className="job-meta">
        <span>{job.owner || 'Unassigned'}</span>
        {job.in_hands_date && (
          <span>
            <CalendarDays size={14} />
            {new Date(job.in_hands_date).toLocaleDateString()}
          </span>
        )}
      </div>
      {job.snippet && <p className="job-snippet">{job.snippet}</p>}
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Own Ops CRM</h1>
        <div className="header-actions">
          <div className="filter-toggle" role="group" aria-label="Job filter">
            <button
              type="button"
              className={filterMode === 'mine' ? 'active' : ''}
              onClick={() => setFilterMode('mine')}
            >
              My Items
            </button>
            <button
              type="button"
              className={filterMode === 'all' ? 'active' : ''}
              onClick={() => setFilterMode('all')}
            >
              All Items
            </button>
          </div>
          <button type="button" className="refresh" onClick={refreshFromApi} disabled={loading}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="banner warning">{error}</div>}
      {actionMessage && <div className="banner info">{actionMessage}</div>}

      <main className="dashboard">
        <section className="calendar-panel">
          <div className="panel-header">
            <button type="button" onClick={goToPrevMonth} aria-label="Previous month">
              ‹
            </button>
            <h2>
              {activeMonth.toLocaleString('default', { month: 'long' })}{' '}
              {activeMonth.getFullYear()}
            </h2>
            <button type="button" onClick={goToNextMonth} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="calendar-grid">
            {weekdayLabels.map((day) => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
            {calendarCells.map((cell) => {
              const dateKey = cell.date.toISOString().slice(0, 10);
              const entries = jobsByDate[dateKey] || [];
              return (
                <div
                  key={cell.key}
                  className={`calendar-cell${cell.inMonth ? '' : ' muted'}`}
                >
                  <div className="date-label">{cell.day}</div>
                  <div className="calendar-jobs">
                    {entries.map((job) => (
                      <button
                        type="button"
                        key={job.id}
                        className={`calendar-chip${job.id === selectedJobId ? ' active' : ''}`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        J:{job.job_no}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="board-panel">
          <div className="kanban">
            {statusColumns.map((column) => (
              <div
                key={column.key}
                className="kanban-column"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(column.key)}
              >
                <div className="kanban-header">
                  <span>{column.label}</span>
                  <span className="count">{(jobsByStatus[column.key] || []).length}</span>
                </div>
                <div className="kanban-body">
                  {(jobsByStatus[column.key] || []).map((job) => renderJobCard(job))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="detail-panel">
          <h2>Job Detail</h2>
          {selectedJob ? (
            <div className="detail-body">
              <div className="detail-row">
                <span className="label">Job #</span>
                <span>{selectedJob.job_no}</span>
              </div>
              <div className="detail-row">
                <span className="label">Title</span>
                <span>{selectedJob.title}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status</span>
                <span className="status-pill">{selectedJob.status}</span>
              </div>
              <div className="detail-row">
                <span className="label">Owner</span>
                <span>{selectedJob.owner || 'Unassigned'}</span>
              </div>
              <div className="detail-row">
                <span className="label">In-hands</span>
                <span>
                  {selectedJob.in_hands_date
                    ? new Date(selectedJob.in_hands_date).toLocaleDateString()
                    : 'TBD'}
                </span>
              </div>
              {selectedJob.est_so_no && (
                <div className="detail-row">
                  <span className="label">Est / SO</span>
                  <span>{selectedJob.est_so_no}</span>
                </div>
              )}
              {selectedJob.snippet && (
                <div className="detail-row">
                  <span className="label">Latest note</span>
                  <span className="snippet">{selectedJob.snippet}</span>
                </div>
              )}

              <div className="detail-actions">
                <button
                  type="button"
                  onClick={() => selectedJob.gmail_link && window.open(selectedJob.gmail_link, '_blank')}
                  disabled={!selectedJob.gmail_link}
                >
                  <Mail size={16} />
                  Open Email
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyLink(selectedJob.gmail_link)}
                  disabled={!selectedJob.gmail_link}
                >
                  <Copy size={16} />
                  Copy Gmail Link
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenFolder(selectedJob.folder_path)}
                >
                  <FolderOpen size={16} />
                  Open Folder
                </button>
                {selectedJob.gmail_link && (
                  <a className="detail-link" href={selectedJob.gmail_link} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    Open in Gmail
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p>Select a job from the board or calendar to see its details.</p>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
