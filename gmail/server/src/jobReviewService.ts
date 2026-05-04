import { JOB_SOURCES } from './config';
import { JobFiltersBySource, readJobFilters } from './filterStore';
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
  const results: JobReviewResult[] = [];

  for (const source of JOB_SOURCES) {
    onStatus?.(`Fetching ${source.displayName} emails from ${source.fromEmail}...`);
    const emails = await fetchers[source.id]();
    onStatus?.(`Fetched ${emails.length} ${source.displayName} emails.`);

    const review = generateReview(source, emails, {
      writeHtml: writeFiles,
      writeJson
    });

    const filteredReview = generateFilteredReview(source, filters[source.id], {
      reviewData: review,
      writeHtml: writeFiles,
      writeJson
    });

    results.push({
      source,
      review,
      filteredReview
    });
  }

  return results;
}
