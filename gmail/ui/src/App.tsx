import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, MailOpen, RefreshCw, Save, SlidersHorizontal } from 'lucide-react';

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

  async function refreshReviews(filtersToApply: JobFiltersBySource | null = filters) {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshReviews();
  }, []);

  const activeSource = useMemo(() => {
    return data?.sources.find(source => source.source.id === activeSourceId) || data?.sources[0];
  }, [activeSourceId, data]);

  const activeReview = activeSource ? (showFiltered ? activeSource.filteredReview : activeSource.review) : null;
  const activeFilter = activeSource && filters ? filters[activeSource.source.id] : null;

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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Gmail job alerts</p>
          <h1>Job Email Review</h1>
          <p className="subtitle">
            {data
              ? `Refreshed ${formatDateTime(data.refreshedAt)} in ${Math.round(data.elapsedMs / 1000)}s`
              : 'Fetching the latest messages from Gmail...'}
          </p>
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
            <section className="filter-panel" aria-label={`${activeReview.summary.displayName} filters`}>
              <div className="filter-title">
                <SlidersHorizontal size={18} />
                <div>
                  <h2>{activeSource?.source.id} filters</h2>
                  <p>These settings apply to the filtered result view.</p>
                </div>
              </div>

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
          </section>

          <section className="email-list" aria-label={`${activeReview.summary.displayName} emails`}>
            {activeReview.emails.map((email, emailIndex) => (
              <details
                className="email-block"
                key={`${email.threadId || email.subject}-${email.datetime}`}
                open={emailIndex === 0}
              >
                <summary className="email-header">
                  <div>
                    <h2>{email.subject}</h2>
                    <p>{email.datetime}</p>
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
                          <h3>{job.title}</h3>
                          <p>{[job.company, job.location, job.salary?.text, job.postedDate, job.rating].filter(Boolean).join(' | ')}</p>
                          {job.details.length > 0 && (
                            <ul>
                              {job.details.map(detail => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <a className="job-link" href={job.link} target="_blank" rel="noreferrer" title="Open job">
                          <ExternalLink size={17} />
                        </a>
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
}
