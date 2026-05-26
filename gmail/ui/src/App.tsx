import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MailOpen, RefreshCw, Save, SlidersHorizontal, X } from 'lucide-react';

const STARTED_AT_COOKIE = 'jobReviewStartedAt';

type SalaryRangeUsdYear = {
  text: string;
  minUsd?: number;
  maxUsd?: number;
};

type ReviewJob = {
  index: number;
  key: string;
  title: string;
  company: string;
  location: string;
  details: string[];
  link: string;
  salary?: SalaryRangeUsdYear;
  postedDate?: string;
  rating?: string;
};

type ReviewEmail = {
  messageId?: string;
  threadId?: string;
  gmailUrl?: string;
  subject: string;
  datetime: string;
  jobs: ReviewJob[];
};

type ReviewData = {
  summary: {
    sourceId: string;
    sourceEmail: string;
    displayName: string;
    totalEmails: number;
    totalJobs: number;
    createdAt: string;
    createdAtIso: string;
  };
  emails: ReviewEmail[];
};

type SourceReview = {
  source: {
    id: string;
    displayName: string;
    fromEmail: string;
  };
  review: ReviewData;
  filteredReview: ReviewData;
  timing: {
    fetchEmailsMs: number;
    generateReviewMs: number;
    filterReviewMs: number;
    totalMs: number;
    emailCount: number;
    rawJobCount: number;
    filteredJobCount: number;
  };
};

type JobFilterConfig = {
  dedupe: boolean;
  minSalaryUsdYear?: number;
  requireSalaryForMinSalaryFilter?: boolean;
};

type JobFiltersBySource = Record<string, JobFilterConfig>;

type ApiResponse = {
  refreshedAt: string;
  elapsedMs: number;
  filters: JobFiltersBySource;
  sources: SourceReview[];
};

export function App() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string>('');
  const [showFiltered, setShowFiltered] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingFilters, setIsSavingFilters] = useState(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [filters, setFilters] = useState<JobFiltersBySource | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [loadingElapsedMs, setLoadingElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<string>(() => getCookie(STARTED_AT_COOKIE));
  const [isStartConfigOpen, setIsStartConfigOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const startConfigRef = useRef<HTMLDivElement>(null);

  async function refreshReviews(filtersToApply: JobFiltersBySource | null = filters) {
    const requestStartedAt = Date.now();
    setIsLoading(true);
    setLoadingElapsedMs(0);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/reviews', {
        method: filtersToApply ? 'POST' : 'GET',
        headers: {
          accept: 'application/json',
          ...(filtersToApply ? { 'content-type': 'application/json' } : {})
        },
        body: filtersToApply ? JSON.stringify({ filters: filtersToApply }) : undefined
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not refresh job emails.');
      }

      setData(payload);
      setFilters(payload.filters);
      setActiveSourceId(current => current || payload.sources[0]?.source.id || '');
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh job emails.');
    } finally {
      setLoadingElapsedMs(Date.now() - requestStartedAt);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshReviews();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setLoadingElapsedMs(Date.now() - startedAt);
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [isLoading]);

  useEffect(() => {
    if (!isStartConfigOpen) return;

    function closeStartConfigOnOutsideClick(event: PointerEvent) {
      if (!startConfigRef.current?.contains(event.target as Node)) {
        setIsStartConfigOpen(false);
      }
    }

    function closeStartConfigOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsStartConfigOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeStartConfigOnOutsideClick);
    document.addEventListener('keydown', closeStartConfigOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeStartConfigOnOutsideClick);
      document.removeEventListener('keydown', closeStartConfigOnEscape);
    };
  }, [isStartConfigOpen]);

  const activeSource = useMemo(() => {
    return data?.sources.find(source => source.source.id === activeSourceId) || data?.sources[0];
  }, [activeSourceId, data]);

  const activeReview = activeSource ? (showFiltered ? activeSource.filteredReview : activeSource.review) : null;
  const activeFilter = activeSource && filters ? filters[activeSource.source.id] : null;
  const startedElapsed = startedAt ? formatStartedElapsed(startedAt, nowMs) : '';
  const startRelation = startedAt && isFutureDateTime(startedAt, nowMs) ? 'to' : 'since';

  function updateActiveFilter(updates: Partial<JobFilterConfig>) {
    if (!activeSource || !filters) return;
    setFilters({
      ...filters,
      [activeSource.source.id]: {
        ...filters[activeSource.source.id],
        ...updates
      }
    });
  }

  async function saveFiltersAsDefaults() {
    if (!filters) return;

    setIsSavingFilters(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/filters', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ filters })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not save filter defaults.');
      }

      setFilters(payload.filters);
      setNotice('Saved filter defaults to job-filters.local.json.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save filter defaults.');
    } finally {
      setIsSavingFilters(false);
    }
  }

  function updateStartedAt(value: string) {
    setStartedAt(value);
    setNowMs(Date.now());

    if (value) {
      setCookie(STARTED_AT_COOKIE, value);
    } else {
      deleteCookie(STARTED_AT_COOKIE);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Gmail job alerts</p>
          <h1>Job Email Review</h1>
          <div ref={startConfigRef}>
            <div className="time-row" aria-label="Review timing">
              <span className="since-control">
                <span>{startedAt && startedElapsed ? `${startedElapsed} ${startRelation}` : 'set start datetime'}</span>
                <button className="time-config-button" type="button" onClick={() => setIsStartConfigOpen(current => !current)}>
                  {startedAt ? formatDate(startedAt) : 'set start datetime'}
                </button>
              </span>
              <span>
                {isLoading
                  ? `Refreshing... ${formatDuration(loadingElapsedMs)} elapsed`
                  : data
                  ? `Refreshed ${formatDateTime(data.refreshedAt)} in ${formatDuration(data.elapsedMs, 2)}`
                  : 'Fetching the latest messages from Gmail...'}
              </span>
            </div>
            {isStartConfigOpen && (
              <div className="start-config">
                <label className="sr-only" htmlFor="started-at">
                  Start
                </label>
                <input
                  id="started-at"
                  type="datetime-local"
                  value={startedAt}
                  onChange={event => updateStartedAt(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === 'Escape') {
                      setIsStartConfigOpen(false);
                    }
                  }}
                />
                {startedAt && (
                  <button className="icon-button" type="button" title="Clear start" onClick={() => updateStartedAt('')}>
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <button className="icon-text-button" onClick={() => refreshReviews()} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
          <span>{isLoading ? 'Refreshing' : 'Refresh'}</span>
        </button>
      </header>

      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice success">{notice}</div>}

      <section className="controls" aria-label="Review controls">
        <div className="tabs" role="tablist" aria-label="Job source">
          {data?.sources.map(source => (
            <button
              key={source.source.id}
              role="tab"
              aria-selected={source.source.id === activeSource?.source.id}
              className={source.source.id === activeSource?.source.id ? 'tab active' : 'tab'}
              onClick={() => setActiveSourceId(source.source.id)}
            >
              {source.source.id}
            </button>
          ))}
        </div>
        <div className="segmented" aria-label="Review mode">
          <button className={showFiltered ? 'active' : ''} onClick={() => setShowFiltered(true)}>
            Filtered
          </button>
          <button className={!showFiltered ? 'active' : ''} onClick={() => setShowFiltered(false)}>
            Full
          </button>
        </div>
      </section>

      {activeReview ? (
        <>
          {activeFilter && (
            <section className={isFilterPanelOpen ? 'filter-panel open' : 'filter-panel'} aria-label={`${activeReview.summary.displayName} filters`}>
              <button
                className="filter-title"
                type="button"
                aria-expanded={isFilterPanelOpen}
                onClick={() => setIsFilterPanelOpen(current => !current)}
              >
                <SlidersHorizontal size={18} />
                <div>
                  <h2>{activeSource?.source.id} filters</h2>
                  {isFilterPanelOpen && <p>These settings apply to the filtered result view.</p>}
                </div>
                <ChevronDown className="filter-fold-icon" size={18} aria-hidden="true" />
              </button>

              {isFilterPanelOpen && (
                <>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={activeFilter.dedupe}
                      onChange={event => updateActiveFilter({ dedupe: event.target.checked })}
                    />
                    <span>Remove duplicate jobs</span>
                  </label>

                  <label className="number-field">
                    <span>Minimum salary/year</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="No minimum"
                      value={activeFilter.minSalaryUsdYear ?? ''}
                      onChange={event => {
                        const value = event.target.value.trim();
                        updateActiveFilter({
                          minSalaryUsdYear: value ? Number(value) : undefined
                        });
                      }}
                    />
                  </label>

                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={Boolean(activeFilter.requireSalaryForMinSalaryFilter)}
                      onChange={event => updateActiveFilter({ requireSalaryForMinSalaryFilter: event.target.checked })}
                    />
                    <span>Hide jobs without salary when salary filter is set</span>
                  </label>

                  <div className="filter-actions">
                    <button className="icon-text-button" onClick={() => refreshReviews(filters)} disabled={isLoading}>
                      <RefreshCw size={17} className={isLoading ? 'spin' : ''} />
                      <span>Apply filters</span>
                    </button>
                    <button className="icon-text-button" onClick={saveFiltersAsDefaults} disabled={isSavingFilters || !filters}>
                      <Save size={17} />
                      <span>{isSavingFilters ? 'Saving' : 'Save defaults'}</span>
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          <section className="stats" aria-label="Review summary">
            <div>
              <span>Email source</span>
              <strong>{activeReview.summary.sourceEmail}</strong>
            </div>
            <div>
              <span>Emails</span>
              <strong>{activeReview.summary.totalEmails}</strong>
            </div>
            <div>
              <span>Jobs</span>
              <strong>{activeReview.summary.totalJobs}</strong>
            </div>
            <div>
              <span>Created</span>
              <strong>{formatDateTime(activeReview.summary.createdAtIso)}</strong>
            </div>
            <div>
              <span>API time</span>
              <strong>{formatDuration(data.elapsedMs)}</strong>
            </div>
            <div>
              <span>{activeSource?.source.id} fetch</span>
              <strong>{activeSource ? formatDuration(activeSource.timing.fetchEmailsMs) : '-'}</strong>
            </div>
            <div>
              <span>{activeSource?.source.id} total</span>
              <strong>{activeSource ? formatDuration(activeSource.timing.totalMs) : '-'}</strong>
            </div>
          </section>

          <section className="email-list" aria-label={`${activeReview.summary.displayName} emails`}>
            {activeReview.emails.map((email, emailIndex) => (
              <details
                className="email-block"
                key={`${email.threadId || email.subject}-${email.datetime}`}
                open={emailIndex === 0}
              >
                <summary className="email-header">
                  <div className="email-title-row">
                    <span className="email-index">#{emailIndex + 1}</span>
                    <div>
                      <h2>{email.subject}</h2>
                      <p>{email.datetime}</p>
                    </div>
                  </div>
                  <div className="email-actions">
                    {email.gmailUrl && (
                      <a
                        href={email.gmailUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open email in Gmail"
                        onClick={event => event.stopPropagation()}
                      >
                        <MailOpen size={17} />
                        <span>Open email</span>
                      </a>
                    )}
                    <span className="count-pill">{email.jobs.length} jobs</span>
                    <ChevronDown className="fold-icon" size={19} aria-hidden="true" />
                  </div>
                </summary>

                {email.jobs.length ? (
                  <div className="jobs">
                    {email.jobs.map(job => (
                      <article className="job-row" key={`${emailIndex}-${job.key}-${job.index}`}>
                        <div className="job-index">#{job.index}</div>
                        <div className="job-main">
                          <h3>
                            <a className="job-title-link" href={job.link} target="_blank" rel="noreferrer">
                              {job.title}
                            </a>
                          </h3>
                          <p>{[job.company, job.location, job.salary?.text, job.postedDate, job.rating].filter(Boolean).join(' | ')}</p>
                          {job.details.length > 0 && (
                            <ul>
                              {job.details.map(detail => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty">No individual jobs were parsed from this email.</p>
                )}
              </details>
            ))}
          </section>
        </>
      ) : (
        <section className="empty-state">{isLoading ? 'Loading job emails...' : 'No review data available.'}</section>
      )}
    </main>
  );
}

function formatDuration(valueMs: number, fractionDigits = 1): string {
  if (!Number.isFinite(valueMs)) return '-';
  return `${(valueMs / 1000).toFixed(fractionDigits)}s`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  return date.toLocaleDateString(undefined, {
    dateStyle: 'medium'
  });
}

function formatStartedElapsed(value: string, nowMs: number): string {
  const startMs = new Date(value).getTime();
  if (Number.isNaN(startMs)) return '';

  const elapsedMs = nowMs - startMs;
  const absoluteElapsedMs = Math.abs(elapsedMs);
  const totalHours = Math.floor(absoluteElapsedMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return `${days} days ${hours} hours`;
}

function isFutureDateTime(value: string, nowMs: number): boolean {
  const dateMs = new Date(value).getTime();
  return !Number.isNaN(dateMs) && dateMs > nowMs;
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';

  const cookie = document.cookie
    .split('; ')
    .find(part => part.startsWith(`${encodeURIComponent(name)}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
}

function setCookie(name: string, value: string) {
  const maxAgeSeconds = 60 * 60 * 24 * 365;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; samesite=lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; samesite=lax`;
}
