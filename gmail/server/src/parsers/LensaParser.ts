import { JobRecord, ParseJobsFromMessageInput } from './BaseJobEmailParser';
import { HtmlJobEmailParser } from './HtmlJobEmailParser';
import { JobEmail, RawJobPosting } from '../types';
import { parseSalaryUsdYear } from '../utils/salary';

const LENSA = {
  HTML: {
    CARD_START: '<table style="border:1px solid #DDE1E6;border-radius:8px;display:inline-block;border-collapse:collapse">'
  },
  REGEX: {
    TEXT_JOB_LINK: /^\[([^\]]+)\]\((https?:\/\/sg3email\.lensa\.com\/ls\/click\?[^)]+)\)$/i,
    COMPANY_IN_CARD: /<td\b[^>]*font-weight\s*:\s*600[^>]*font-size\s*:\s*14px[^>]*>([\s\S]*?)<\/td>/gi,
    ANCHOR_IN_CARD: /<a\b[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    CARD_LINK: /https?:\/\/sg3email\.lensa\.com\/ls\/click\?/i,
    BLOCKED_TITLE: /^(edit settings|more jobs|unsubscribe|privacy policy|faq)$/i,
    SKIPPED_SHORT_TITLE: /^(LE|Location:?)$/i,
    LOCATION_NEAR_ICON: /icon_location\.png[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,
    DIV_TEXT: /<div\b[^>]*>([\s\S]*?)<\/div>/gi,
    SALARY_IN_CARD: /<div\b[^>]*color\s*:\s*#4D5358[^>]*>([\s\S]*?)<\/div>/gi,
    SPAN_TEXT: /<span\b[^>]*>([\s\S]*?)<\/span>/gi,
    NUMERIC_ONLY: /^\d+(\.\d+)?$/,
    STARS_ONLY: /^[★\s]+$/,
    YOUR_JOB_ALERTS: /^your job alerts/i,
    MORE_JOBS_BOUNDARY: /(?:\[\s*)?more jobs\s*(?:➞|»)?/i,
    TITLE_LINK_LINE: /^\[.+\]\(https?:\/\/sg3email\.lensa\.com\/ls\/click\?/i,
    DETAILS_TAG_TRIGGER: /\bfull-time\b|\bpart-time\b|\bcontract\b/i,
    MARKDOWN_SALARY_LINE: /^(?:about\s+)?\$\s*\d[\d,.]*\s*K?(?:\s*-\s*\$\s*\d[\d,.]*\s*K?)?\s*\/\s*yr\.?/i,
    MARKDOWN_CARD_START: /^\[\s*\|/i,
    MARKDOWN_CARD_CLOSE: /^\]\((https?:\/\/sg3email\.lensa\.com\/ls\/click\?[^)\s]+)/i,
    MARKDOWN_CARD_SEPARATOR: /^---\|---$/,
    MARKDOWN_LOCATION_LINE: /^\|\s*(.+)$/,
    MARKDOWN_IMAGE: /!\[[^\]]*\]\([^)]+\)/g
  },
  WINDOW: {
    COMPANY_LOOK_BACK: 12,
    LOCATION_LOOK_AHEAD: 12,
    SALARY_LOOK_AHEAD: 14,
    DETAILS_LOOK_AHEAD: 22
  },
  LIMIT: {
    MAX_COMPANY_LENGTH: 80,
    MAX_DETAILS_COUNT: 8,
    MAX_TITLE_LENGTH: 140,
    MAX_COMPANY_IN_CARD_LENGTH: 90,
    MAX_DETAIL_LENGTH: 70
  }
} as const;

export async function fetchJobEmails_Lensa(): Promise<JobEmail[]> {
  return new LensaEmailParser().fetchJobEmails();
}

export class LensaEmailParser extends HtmlJobEmailParser {
  protected readonly searchQuery = 'from:jobalert@lensa.com';

  protected async parseJobsFromMessage(input: ParseJobsFromMessageInput): Promise<RawJobPosting[]> {
    const baseInput = {
      payload: input.payload,
      gmail: input.gmail,
      messageId: input.messageId,
      allowAttachment: true
    };

    const htmlBody = await this.extractBodyByMime({
      ...baseInput,
      wantedMimeType: 'text/html'
    });
    const jobsFromHtml = this.parseJobsFromBody(htmlBody);
    if (jobsFromHtml.length > 0) return jobsFromHtml;

    const textBody = await this.extractBodyByMime({
      ...baseInput,
      wantedMimeType: 'text/plain'
    });
    return this.parseJobsFromBody(textBody);
  }

  protected parseJobsFromHtml(html: string): RawJobPosting[] {
    const normalized = this.truncateAtMoreJobs(this.decodeHtmlText(html)).replace(/\r\n/g, '\n');
    const cardSections = normalized.split(LENSA.HTML.CARD_START).slice(1);
    this.resetJobRecords();
    const seenKeys = new Set<string>();

    for (const section of cardSections) {
      const company = this.extractCompanyFromCard(section);
      const titleAndLink = this.extractTitleAndLinkFromCard(section);
      const location = this.extractLocationFromCard(section);
      const salaryText = this.extractSalaryFromCard(section);
      const details = this.extractDetailsFromCard(section);

      if (!company || !titleAndLink || !location) continue;

      const salary = salaryText ? parseSalaryUsdYear(salaryText) : undefined;
      const dedupeKey = `${titleAndLink.title}|${company}|${location}|${titleAndLink.link}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const jobRecord = new JobRecord();
      jobRecord.title = titleAndLink.title;
      jobRecord.company = company;
      jobRecord.location = location;
      jobRecord.link = titleAndLink.link;
      jobRecord.salary = salary;
      jobRecord.addDetails(details);
      this.addJobRecord(jobRecord);
    }
    return this.toRawJobPostingsFromJobRecords();
  }

  protected parseJobsFromText(text: string): RawJobPosting[] {
    const lines = this.truncateAtMoreJobs(text)
      .split('\n')
      .map(line => this.decodeHtmlText(line).replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const jobsFromMarkdownCards = this.parseJobsFromMarkdownCards(lines);
    if (jobsFromMarkdownCards.length > 0) return jobsFromMarkdownCards;

    this.resetJobRecords();

    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(LENSA.REGEX.TEXT_JOB_LINK);
      if (!match) continue;

      const title = match[1].trim();
      const link = match[2].trim();
      const company = this.findCompanyNear(lines, index);
      const location = this.findLocationNear(lines, index);
      const salaryText = this.findSalaryNear(lines, index);
      const salary = salaryText ? parseSalaryUsdYear(salaryText) : undefined;
      const details = this.findDetailsNear(lines, index).filter(Boolean);
      if (!title || !link || !company || !location) continue;

      const jobRecord = new JobRecord();
      jobRecord.title = title;
      jobRecord.company = company;
      jobRecord.location = location;
      jobRecord.link = link;
      jobRecord.salary = salary;
      jobRecord.addDetails(details);
      this.addJobRecord(jobRecord);
    }
    return this.toRawJobPostingsFromJobRecords();
  }

  protected getJobKey(job: RawJobPosting): string {
    const upnMatch = job.link.match(/[?&]upn=([^&]+)/i);
    if (upnMatch) return `lensa:${upnMatch[1].toLowerCase()}`;
    return `lensa:${job.title}|${job.company}|${job.location}`.toLowerCase();
  }

  private extractCompanyFromCard(card: string): string {
    for (const match of card.matchAll(LENSA.REGEX.COMPANY_IN_CARD)) {
      const text = this.cleanHtmlText(match[1] ?? '');
      if (!text) continue;
      if (LENSA.REGEX.NUMERIC_ONLY.test(text)) continue;
      if (LENSA.REGEX.STARS_ONLY.test(text)) continue;
      if (text.length > LENSA.LIMIT.MAX_COMPANY_IN_CARD_LENGTH) continue;
      return text.replace(/\u2024/g, '·');
    }

    return '';
  }

  private extractTitleAndLinkFromCard(card: string): { title: string; link: string } | null {
    for (const match of card.matchAll(LENSA.REGEX.ANCHOR_IN_CARD)) {
      const rawLink = (match[1] ?? '').replace(/&amp;/g, '&').trim();
      const title = this.cleanHtmlText(match[2] ?? '');
      if (!rawLink || !title) continue;
      if (!LENSA.REGEX.CARD_LINK.test(rawLink)) continue;
      if (title.length > LENSA.LIMIT.MAX_TITLE_LENGTH) continue;
      if (LENSA.REGEX.BLOCKED_TITLE.test(title)) continue;
      if (LENSA.REGEX.SKIPPED_SHORT_TITLE.test(title)) continue;
      return { title, link: rawLink };
    }

    return null;
  }

  private extractLocationFromCard(card: string): string {
    const nearIcon = card.match(LENSA.REGEX.LOCATION_NEAR_ICON);
    if (nearIcon) {
      const location = this.cleanHtmlText(nearIcon[1] ?? '');
      if (this.looksLikeLocation(location)) return location;
    }

    for (const match of card.matchAll(LENSA.REGEX.DIV_TEXT)) {
      const text = this.cleanHtmlText(match[1] ?? '');
      if (this.looksLikeLocation(text)) return text;
    }

    return '';
  }

  private extractSalaryFromCard(card: string): string {
    for (const match of card.matchAll(LENSA.REGEX.SALARY_IN_CARD)) {
      const text = this.cleanHtmlText(match[1] ?? '');
      if (this.looksLikeSalary(text)) return text;
    }
    return '';
  }

  private extractDetailsFromCard(card: string): string[] {
    const details: string[] = [];

    for (const match of card.matchAll(LENSA.REGEX.SPAN_TEXT)) {
      const text = this.cleanHtmlText(match[1] ?? '');
      if (!text) continue;
      if (text.length > LENSA.LIMIT.MAX_DETAIL_LENGTH) continue;
      if (LENSA.REGEX.STARS_ONLY.test(text)) continue;
      if (LENSA.REGEX.NUMERIC_ONLY.test(text)) continue;
      if (text.toLowerCase() === 'new') continue;
      details.push(text);
    }

    return Array.from(new Set(details)).slice(0, LENSA.LIMIT.MAX_DETAILS_COUNT);
  }

  private parseJobsFromMarkdownCards(lines: string[]): RawJobPosting[] {
    this.resetJobRecords();
    const seenKeys = new Set<string>();

    for (let index = 0; index < lines.length; index += 1) {
      if (!LENSA.REGEX.MARKDOWN_CARD_START.test(lines[index])) continue;

      const block: string[] = [];
      let closeMatch: RegExpMatchArray | null = null;
      for (let cursor = index; cursor < lines.length; cursor += 1) {
        const line = lines[cursor];
        block.push(line);

        closeMatch = line.match(LENSA.REGEX.MARKDOWN_CARD_CLOSE);
        if (closeMatch) {
          index = cursor;
          break;
        }
      }

      const link = closeMatch?.[1]?.trim() ?? '';
      if (!link) continue;

      const separatorIndex = block.findIndex(line => LENSA.REGEX.MARKDOWN_CARD_SEPARATOR.test(line));
      if (separatorIndex <= 0 || separatorIndex + 1 >= block.length) continue;

      const company = this.normalizeMarkdownCardCompany(block[separatorIndex - 1]);
      const title = block[separatorIndex + 1]?.trim() ?? '';
      const salaryText = block.find(line => LENSA.REGEX.MARKDOWN_SALARY_LINE.test(line)) ?? '';
      const details = this.extractMarkdownCardDetails(block.slice(separatorIndex + 2, -1));
      const location = this.extractMarkdownCardLocation(block, details);

      if (!company || !title || !location) continue;
      if (LENSA.REGEX.BLOCKED_TITLE.test(title)) continue;

      const salary = salaryText ? parseSalaryUsdYear(salaryText) : undefined;
      const dedupeKey = `${title}|${company}|${location}|${link}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const jobRecord = new JobRecord();
      jobRecord.title = title;
      jobRecord.company = company;
      jobRecord.location = location;
      jobRecord.link = link;
      jobRecord.salary = salary;
      jobRecord.addDetails(details);
      this.addJobRecord(jobRecord);
    }

    return this.toRawJobPostingsFromJobRecords();
  }

  private normalizeMarkdownCardCompany(value: string): string {
    const withoutImages = value.replace(LENSA.REGEX.MARKDOWN_IMAGE, '');
    const text = withoutImages.includes('|') ? withoutImages.split('|').pop() ?? '' : withoutImages;
    return this.normalizeCompany(text);
  }

  private extractMarkdownCardDetails(lines: string[]): string[] {
    const detailLineStart = lines.findIndex(line => LENSA.REGEX.DETAILS_TAG_TRIGGER.test(line));
    if (detailLineStart === -1) return [];

    const detailText = lines
      .slice(detailLineStart)
      .filter(line => !this.looksLikeSalary(line))
      .join(' ')
      .replace(/\s*•\s*/g, '•');

    return detailText
      .split('•')
      .map(part => part.trim())
      .filter(part => part && part.toLowerCase() !== 'new')
      .slice(0, LENSA.LIMIT.MAX_DETAILS_COUNT);
  }

  private truncateAtMoreJobs(value: string): string {
    const match = value.match(LENSA.REGEX.MORE_JOBS_BOUNDARY);
    if (match?.index === undefined) return value;
    return value.slice(0, match.index);
  }

  private extractMarkdownCardLocation(block: string[], details: string[]): string {
    for (const line of block) {
      const locationMatch = line.match(LENSA.REGEX.MARKDOWN_LOCATION_LINE);
      const location = locationMatch?.[1]?.trim() ?? '';
      if (this.looksLikeLocation(location)) return location;
    }

    return details.find(detail => this.looksLikeLocation(detail)) ?? '';
  }

  private findCompanyNear(lines: string[], anchorIndex: number): string {
    for (let i = anchorIndex - 1; i >= Math.max(0, anchorIndex - LENSA.WINDOW.COMPANY_LOOK_BACK); i -= 1) {
      const candidate = this.normalizeCompany(lines[i]);
      if (!candidate) continue;
      if (this.looksLikeLocation(candidate)) continue;
      if (this.looksLikeSalary(candidate)) continue;
      if (this.looksLikeTitleLinkLine(candidate)) continue;
      if (candidate.includes('|') && candidate.includes('★')) continue;
      if (candidate.length < 2 || candidate.length > LENSA.LIMIT.MAX_COMPANY_LENGTH) continue;
      return candidate;
    }
    return '';
  }

  private normalizeCompany(value: string): string {
    const trimmed = value.replace(/[=]+\s*$/g, '').trim();
    if (!trimmed) return '';
    if (trimmed === '---' || trimmed.startsWith('---|---')) return '';
    if (trimmed.startsWith('![') || trimmed.startsWith('|')) return '';
    if (LENSA.REGEX.YOUR_JOB_ALERTS.test(trimmed)) return '';
    return trimmed.replace(/\u2024/g, '·').trim();
  }

  private looksLikeTitleLinkLine(value: string): boolean {
    return LENSA.REGEX.TITLE_LINK_LINE.test(value);
  }

  private findLocationNear(lines: string[], anchorIndex: number): string {
    for (let i = anchorIndex + 1; i <= Math.min(lines.length - 1, anchorIndex + LENSA.WINDOW.LOCATION_LOOK_AHEAD); i += 1) {
      const candidate = lines[i];
      if (!candidate) continue;
      if (this.looksLikeLocation(candidate)) return candidate;
    }
    return '';
  }

  private findSalaryNear(lines: string[], anchorIndex: number): string {
    for (let i = anchorIndex; i <= Math.min(lines.length - 1, anchorIndex + LENSA.WINDOW.SALARY_LOOK_AHEAD); i += 1) {
      const candidate = lines[i];
      if (!candidate) continue;
      if (this.looksLikeSalary(candidate)) return candidate;
    }
    return '';
  }

  private findDetailsNear(lines: string[], anchorIndex: number): string[] {
    const details: string[] = [];

    for (let i = anchorIndex + 1; i <= Math.min(lines.length - 1, anchorIndex + LENSA.WINDOW.DETAILS_LOOK_AHEAD); i += 1) {
      const candidate = lines[i];
      if (!candidate) continue;
      if (this.looksLikeLocation(candidate)) continue;
      if (this.looksLikeSalary(candidate)) continue;
      if (candidate.startsWith('[') || candidate.startsWith('![')) continue;
      if (candidate.startsWith('---')) continue;
      if (LENSA.REGEX.YOUR_JOB_ALERTS.test(candidate)) continue;

      if (LENSA.REGEX.DETAILS_TAG_TRIGGER.test(candidate)) {
        details.push(...this.splitTags(candidate));
        break;
      }
    }

    return details.map(item => item.trim()).filter(Boolean).slice(0, LENSA.LIMIT.MAX_DETAILS_COUNT);
  }

  private splitTags(value: string): string[] {
    const normalized = value.replace(/\s{2,}/g, '  ').trim();
    if (normalized.includes('  ')) {
      return normalized.split('  ').map(part => part.trim()).filter(Boolean);
    }
    return [normalized];
  }
}
