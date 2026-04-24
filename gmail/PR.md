# PR Title

- Gmail - Refactor parsers/review pipeline
- Gmail - Add debug JSON mode + object-first filtering
- Interview - Include track updates

## GMAIL

### Summary

This section refactors the Gmail job-review pipeline for better maintainability, readability, and runtime behavior.

Key goals:

- Make parser flow easier to understand and extend
- Reduce duplication in source-specific parsers
- Keep JSON files for debugging only
- Use object-first flow in normal runs to avoid unnecessary I/O

### What Changed

#### 1) Parser architecture refactor

- Introduced/standardized parser tiers:
  - `BaseJobEmailParser`
  - `HtmlJobEmailParser`
  - source parsers (`LinkedIn`, `Glassdoor`, `Lensa`)
- Unified parser contract with typed input for message parsing.
- Kept source-specific flavor logic isolated in child parsers.
- Kept shared behavior centralized in base tiers.

#### 2) Job record flow clarity

- Parsing now uses explicit creation + add flow for readability:
  - `const jobRecord = new JobRecord()`
  - `this.addJobRecord(jobRecord)`
- Removed confusing implicit record creation patterns.

#### 3) Readability improvements (regex/config scoping)

- Refactored large parser constants into scoped config objects:
  - `LENSA.*`
  - `GLASSDOOR.*`
  - `LINKEDIN.*`
- Example style: `LENSA.REGEX.TEXT_JOB_LINK`, `LENSA.WINDOW.LOCATION_LOOK_AHEAD`.
- Improved naming consistency (`LOOK_AHEAD`, `LOOK_BACK`).

#### 4) Review pipeline behavior

- `index.ts` now supports debug mode via `--debug`.
- Normal mode (`reviewJobs`):
  - Uses in-memory `reviewData` directly for filtered review.
  - Avoids JSON read/write in pipeline.
- Debug mode (`reviewJobs:debug`):
  - Writes JSON snapshots for inspection.
- Logging now includes structured filter info via JSON output.

#### 5) Script and README updates

- Added:
  - `reviewJobs:debug`: `ts-node src/index.ts --debug`
- Kept:
  - `reviewJobs`: normal object-first mode
- Updated README to document normal vs debug modes and output behavior.

#### 6) Sample coverage

- Sample-driven review flow is included and aligned with parser changes:
  - `Sample/LinkedIn.eml`
  - `Sample/Glassdoor.eml`
  - `Sample/Lensa.eml`
- `reviewSamples` remains available to generate review outputs from explicit sample files.

### Validation

- TypeScript build passes: `npm run build`
- Manual flow checked for:
  - `reviewJobs` (object-first)
  - `reviewJobs:debug` (JSON snapshot mode)
  - `reviewSamples` (sample `.eml` parsing path)

### Notes

- JSON outputs are treated as debug artifacts rather than pipeline dependencies.
- Runtime remains sequential by design to keep logs and debugging straightforward.

## INTERVIEW

### Summary

Reviewed changes under `C:\dev\yhtang\node-js\interview` on `dev`.

- Added TypeScript interview-practice scaffold and solutions (`two-sum`, `group-anagrams`, `top-k-frequent-elements`, `palindrome`, etc.).
- Scope: 12 files changed in `interview/`, mostly net-new content.
- Includes local debug helper and benchmarking variants in `random-numbers.ts`.

### Review Findings

- **Follow-up needed:** `interview/package.json` has `"dev": "... src/index.ts"` but `interview/src/index.ts` does not exist.
- Several files include intentional debug prints (`console.log(...)`) and interview comments; acceptable for practice, but suggest trimming for cleaner examples.
- Minor cleanup opportunities:
  - remove unused imports (e.g., `lodash` where not used),
  - remove unused parameters (e.g., `target` in `containsDuplicate`),
  - add a single runnable entrypoint for consistency.

### Recommendation

- Keep these as **non-blocking follow-ups** for the interview-practice folder since they are separate from the Gmail parser pipeline changes.
