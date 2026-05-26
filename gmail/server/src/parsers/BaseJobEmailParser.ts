import { getGmailClient, getGmailQueryConfig } from '../auth';
import { decodeQuotedPrintable } from '../utils/quotedPrintable';
import { JobEmail, JobPosting, RawJobPosting, SalaryRangeUsdYear } from '../types';

type GmailPayload = {
  mimeType?: string | null;
  body?: { data?: string | null; attachmentId?: string | null } | null;
  parts?: GmailPayload[] | null;
  headers?: Array<{ name?: string | null; value?: string | null }> | null;
};

export type ParseJobsFromMessageInput = {
  gmail: any;
  messageId: string;
  payload: GmailPayload | undefined;
};

export class JobRecord {
  private _title = '';
  private _company = '';
  private _location = '';
  private _link = '';
  private _details: string[] = [];
  private _salary?: SalaryRangeUsdYear;
  private _postedDate?: string;
  private _rating?: string;

  set title(newValue: string) {
    this._title = normalizeText(newValue);
  }

  set company(newValue: string) {
    this._company = normalizeText(newValue);
  }

  set location(newValue: string) {
    this._location = normalizeText(newValue);
  }

  set link(newValue: string) {
    this._link = normalizeText(newValue);
  }

  set salary(newValue: SalaryRangeUsdYear | undefined) {
    this._salary = newValue;
  }

  set postedDate(newValue: string | undefined) {
    this._postedDate = newValue ? normalizeText(newValue) : undefined;
  }

  set rating(newValue: string | undefined) {
    this._rating = newValue ? normalizeText(newValue) : undefined;
  }

  public addDetails(values: string[]): void {
    for (const value of values) {
      const normalized = normalizeText(value);
      if (!normalized) continue;
      if (!this._details.includes(normalized)) this._details.push(normalized);
    }
  }

  public toRawJobPosting(): RawJobPosting | null {
    const title = this._title.trim();
    const company = this._company.trim();
    const location = this._location.trim();
    const link = this._link.trim();

    if (!title || !company || !location || !link) return null;

    return {
      title,
      company,
      location,
      link,
      details: this._details,
      salary: this._salary,
      postedDate: this._postedDate,
      rating: this._rating
    };
  }
}

export abstract class BaseJobEmailParser {
  protected abstract readonly searchQuery: string;

  protected abstract parseJobsFromMessage(input: ParseJobsFromMessageInput): Promise<RawJobPosting[]>;

  protected abstract getJobKey(job: RawJobPosting): string;

  protected jobRecords: JobRecord[] = [];

  protected resetJobRecords(): void {
    this.jobRecords = [];
  }

  protected addJobRecord(jobRecord: JobRecord): void {
    this.jobRecords.push(jobRecord);
  }

  protected toRawJobPostingsFromJobRecords(): RawJobPosting[] {
    const jobs: RawJobPosting[] = [];
    for (const record of this.jobRecords) {
      const parsed = record.toRawJobPosting();
      if (parsed) jobs.push(parsed);
    }
    return jobs;
  }

  public toJobPostings(rawJobs: RawJobPosting[]): JobPosting[] {
    return rawJobs.map(job => ({
      ...job,
      key: this.getJobKey(job)
    }));
  }

  public async fetchJobEmails(): Promise<JobEmail[]> {
    const gmail = await getGmailClient();
    const queryConfig = getGmailQueryConfig();
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: this.buildSearchQuery(queryConfig.newerThan),
      maxResults: queryConfig.maxResultsPerSource
    });

    if (!listResponse.data.messages) return [];

    return mapWithConcurrency(listResponse.data.messages, queryConfig.messageDetailConcurrency, async message => {
      const messageId = message.id!;
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const threadId = detail.data.threadId || message.threadId || messageId;
      const headers = detail.data.payload?.headers || [];
      const subject = this.getHeaderValue(headers, 'Subject');
      const date = this.getHeaderValue(headers, 'Date');
      const jobs = await this.parseJobsFromMessage({
        gmail,
        messageId,
        payload: detail.data.payload
      });

      return {
        messageId,
        threadId,
        gmailUrl: this.buildGmailThreadUrl(threadId),
        subject,
        date,
        jobs: this.toJobPostings(jobs)
      };
    });
  }

  protected getHeaderValue(
    headers: Array<{ name?: string | null; value?: string | null }>,
    name: string
  ): string {
    return headers.find(header => header.name === name)?.value || '';
  }

  protected extractPartBodyFromRawEml(rawEml: string, wantedMimeType: 'text/plain' | 'text/html'): string {
    if (!rawEml) return '';

    const mime = this.escapeRegexForMime(wantedMimeType);
    const boundary = this.extractMimeBoundary(rawEml);
    const partEndPattern = boundary
      ? `\\r?\\n--${this.escapeRegexForMime(boundary)}(?:--)?`
      : '\\r?\\n--[^\\r\\n]{8,}';
    const partRegex = new RegExp(
      `Content-Type:\\s*${mime}[^\\r\\n]*\\r?\\n([\\s\\S]*?)\\r?\\n\\r?\\n([\\s\\S]*?)(?=${partEndPattern}|$)`,
      'gi'
    );

    for (const match of rawEml.matchAll(partRegex)) {
      const headers = match[1] ?? '';
      const body = (match[2] ?? '').trim();
      if (!body) continue;

      const encodingMatch = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
      const encoding = (encodingMatch?.[1] ?? '').trim().toLowerCase();
      const decoded = this.decodePartBody(body, encoding);
      if (decoded) return decoded;
    }

    return '';
  }

  private decodePartBody(body: string, encoding: string): string {
    if (!encoding || encoding === '7bit' || encoding === '8bit' || encoding === 'binary') {
      return body;
    }

    if (encoding.includes('quoted-printable')) {
      return decodeQuotedPrintable(body);
    }

    if (encoding.includes('base64')) {
      try {
        const compact = body.replace(/\s+/g, '');
        return Buffer.from(compact, 'base64').toString('utf8');
      } catch {
        return body;
      }
    }

    return body;
  }

  private escapeRegexForMime(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private extractMimeBoundary(rawEml: string): string {
    const headerEnd = rawEml.search(/\r?\n\r?\n/);
    const headers = headerEnd >= 0 ? rawEml.slice(0, headerEnd) : rawEml;
    const contentType = headers.match(/^Content-Type:\s*([^\r\n]*(?:\r?\n[ \t][^\r\n]*)*)/im)?.[1] ?? '';
    const unfolded = contentType.replace(/\r?\n[ \t]+/g, ' ');
    const quoted = unfolded.match(/boundary\s*=\s*"([^"]+)"/i);
    if (quoted) return quoted[1];
    return unfolded.match(/boundary\s*=\s*([^;\s]+)/i)?.[1] ?? '';
  }

  private buildGmailThreadUrl(threadId: string): string {
    return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(threadId)}`;
  }

  private buildSearchQuery(newerThan: string): string {
    const trimmedWindow = newerThan.trim();
    if (!trimmedWindow) return this.searchQuery;
    return `${this.searchQuery} newer_than:${trimmedWindow}`;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
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
