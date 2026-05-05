import { JOB_SOURCES } from './config';
import { JobFiltersBySource, readJobFilters } from './filterStore';
import { getGmailQueryConfig } from './auth';
import { fetchJobEmails_Glassdoor } from './parsers/GlassdoorParser';
import { fetchJobEmails_LinkedIn } from './parsers/LinkedInParser';
import { fetchJobEmails_Lensa } from './parsers/LensaParser';
import { generateFilteredReview } from './generateFilteredReview';
import { generateReview, ReviewData } from './generateReview';
import { JobEmail, JobSourceConfig, JobSourceId } from './types';

export interface JobReviewResult {
  source: JobSourceConfig;
  review: ReviewData;
  filteredReview: ReviewData;
  timing: JobReviewTiming;
}

export interface JobReviewTiming {
  fetchEmailsMs: number;
  generateReviewMs: number;
  filterReviewMs: number;
  totalMs: number;
  emailCount: number;
  rawJobCount: number;
  filteredJobCount: number;
}

export interface FetchJobReviewsOptions {
  filters?: JobFiltersBySource;
  writeFiles?: boolean;
  writeJson?: boolean;
  onStatus?: (message: string) => void;
}

const fetchers: Record<JobSourceId, () => Promise<JobEmail[]>> = {
  LinkedIn: fetchJobEmails_LinkedIn,
  Glassdoor: fetchJobEmails_Glassdoor,
  Lensa: fetchJobEmails_Lensa
};

export async function fetchJobReviews(options: FetchJobReviewsOptions = {}): Promise<JobReviewResult[]> {
  const { filters = readJobFilters(), writeFiles = false, writeJson = false, onStatus } = options;
  const queryConfig = getGmailQueryConfig();

  return mapWithConcurrency(JOB_SOURCES, queryConfig.sourceConcurrency, async source => {
    const sourceStartedAt = Date.now();
    onStatus?.(`Fetching ${source.displayName} emails from ${source.fromEmail}...`);
    const fetchStartedAt = Date.now();
    const emails = await fetchers[source.id]();
    const fetchEmailsMs = Date.now() - fetchStartedAt;
    onStatus?.(`Fetched ${emails.length} ${source.displayName} emails.`);

    const generateStartedAt = Date.now();
    const review = generateReview(source, emails, {
      writeHtml: writeFiles,
      writeJson
    });
    const generateReviewMs = Date.now() - generateStartedAt;

    const filterStartedAt = Date.now();
    const filteredReview = generateFilteredReview(source, filters[source.id], {
      reviewData: review,
      writeHtml: writeFiles,
      writeJson
    });
    const filterReviewMs = Date.now() - filterStartedAt;
    const totalMs = Date.now() - sourceStartedAt;

    onStatus?.(
      `${source.displayName} timing: fetch=${formatMs(fetchEmailsMs)}, review=${formatMs(generateReviewMs)}, filter=${formatMs(filterReviewMs)}, total=${formatMs(totalMs)}.`
    );

    return {
      source,
      review,
      filteredReview,
      timing: {
        fetchEmailsMs,
        generateReviewMs,
        filterReviewMs,
        totalMs,
        emailCount: emails.length,
        rawJobCount: review.summary.totalJobs,
        filteredJobCount: filteredReview.summary.totalJobs
      }
    };
  });
}

function formatMs(value: number): string {
  return `${(value / 1000).toFixed(2)}s`;
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  worker: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}
