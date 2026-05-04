import fs from 'fs';
import path from 'path';
import { JOB_FILTERS, JOB_SOURCES } from './config';
import { JobFilterConfig, JobSourceId } from './types';

export type JobFiltersBySource = Record<JobSourceId, JobFilterConfig>;

const FILTERS_PATH = path.join(__dirname, '../../job-filters.local.json');

export function readJobFilters(): JobFiltersBySource {
  if (!fs.existsSync(FILTERS_PATH)) return cloneFilters(JOB_FILTERS);

  try {
    const parsed = JSON.parse(fs.readFileSync(FILTERS_PATH, 'utf8'));
    return normalizeJobFilters(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Could not read ${path.basename(FILTERS_PATH)}: ${message}`);
  }
}

export function writeJobFilters(filters: unknown): JobFiltersBySource {
  const normalized = normalizeJobFilters(filters);
  fs.writeFileSync(FILTERS_PATH, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export function normalizeJobFilters(filters: unknown): JobFiltersBySource {
  const input = isObject(filters) ? filters : {};
  const normalized = cloneFilters(JOB_FILTERS);

  for (const source of JOB_SOURCES) {
    const rawSourceInput = input[source.id];
    const sourceInput: Record<string, unknown> = isObject(rawSourceInput) ? rawSourceInput : {};
    const minSalary = toOptionalNumber(sourceInput.minSalaryUsdYear);

    normalized[source.id] = {
      dedupe: toBoolean(sourceInput.dedupe, normalized[source.id].dedupe),
      ...(typeof minSalary === 'number' ? { minSalaryUsdYear: minSalary } : {}),
      requireSalaryForMinSalaryFilter: toBoolean(
        sourceInput.requireSalaryForMinSalaryFilter,
        Boolean(normalized[source.id].requireSalaryForMinSalaryFilter)
      )
    };
  }

  return normalized;
}

function cloneFilters(filters: JobFiltersBySource): JobFiltersBySource {
  return JSON.parse(JSON.stringify(filters)) as JobFiltersBySource;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === '' || value === null || typeof value === 'undefined') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
