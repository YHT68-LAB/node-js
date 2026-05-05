# Job Review (LinkedIn + Glassdoor + Lensa)

## Table of Contents

- [Overview](#overview)
- [1. Project Setup](#1-project-setup)
- [2. Manage Token](#2-manage-token)
- [3. Use the React Review UI](#3-use-the-react-review-ui)
- [4. Create Static Review Files](#4-create-static-review-files)
- [5. Architecture](#5-architecture)
- [Notes](#notes)

## Overview

This project reads job alert emails from Gmail (LinkedIn + Glassdoor + Lensa), serves a React review UI, and can still generate review files in both HTML and JSON format.

Project layout:

- [`server/src`](./server/src): Node/Gmail/parser/API code.
- [`ui/src`](./ui/src): React browser UI code.
- `frontend-dist`: generated UI bundle created by `npm run ui:build` and ignored by git.

## 1. Project Setup

### Install dependencies

```bash
npm install
```

### Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project, for example `gmail-email-fetcher`.
3. Enable the **Gmail API** for that project.

### Configure the OAuth consent screen

1. Open **APIs & Services -> OAuth consent screen**.
2. Choose **External** for testing.
3. Fill in the basic app information.
4. Keep the app in **Testing** status.
5. Add your Gmail account under **Test Users**.

Only test users can authorize the app while it is in testing mode.

### Create OAuth credentials

1. Open **APIs & Services -> Credentials**.
2. Create an **OAuth 2.0 Client ID**.
3. Choose **Desktop app**.
4. Download the client credentials JSON file.
5. Put that file somewhere safe on your machine.

### Configure `gmail-api.config.json`

This project reads Gmail credential paths from [`gmail-api.config.json`](./gmail-api.config.json).

Example:

```json
{
  "gmailApiConfig": {
    "paths": {
      "clientSecret": "C:\\Users\\ANDY TANG\\OneDrive\\Documents\\ANDY\\GMAIL\\madeinuk14_gmail_client_secret_cred.json",
      "token": "C:\\Users\\ANDY TANG\\OneDrive\\Documents\\ANDY\\GMAIL\\gmail_token.json",
      "tokenCopy": "./gmail-token.copy.json"
    },
    "query": {
      "newerThan": "14d",
      "maxResultsPerSource": 50,
      "sourceConcurrency": 3,
      "messageDetailConcurrency": 5
    }
  }
}
```

Fields:

- `clientSecret`: Absolute path to the Google OAuth client credentials JSON.
- `token`: Absolute path to the Gmail OAuth token file created later by `npm run manageToken`.
- `tokenCopy`: Local project-side copied token file.
- `query.newerThan`: Gmail search window added as `newer_than:<value>`.
- `query.maxResultsPerSource`: Maximum Gmail messages fetched per source.
- `query.sourceConcurrency`: Number of job sources fetched at the same time.
- `query.messageDetailConcurrency`: Number of full Gmail messages fetched at the same time within each source.

The current benchmark setting uses `sourceConcurrency: 3` and `messageDetailConcurrency: 5`, which can run the three configured job sources at the same time and fetch up to 15 Gmail message details concurrently across those sources.

How it is used:

- [`auth.ts`](./server/src/auth.ts) loads this file.
- `paths.clientSecret` is used to create the Google OAuth client.
- `paths.token` is used to load the saved Gmail token.
- If the token file is missing, the app asks you to generate it first.

Notes:

- `clientSecret` and `token` can live outside the repo.
- Update the paths on each machine if your local credential locations are different.
- `gmail-token.copy.json` is only a project helper copy and does not replace the real token path in `paths.token`.
- `gmail-token.copy.json` is git-ignored, so the copied local token file will not be committed.

## 2. Manage Token

Run:

```bash
npm run manageToken
```

The script now tries to make the flow easier:

1. It starts a temporary local callback server.
2. It opens the Google authorization page in your browser automatically.
3. After you approve access, Google redirects back to the local callback.
4. The script captures the authorization code automatically and saves the token.

If the browser does not open or the automatic callback flow times out, the script falls back to manual mode and lets you paste either:

- the full redirected URL, or
- just the `code` value

Manual fallback steps:

1. Copy the authorization URL printed in the terminal into your browser.
2. Sign in with your Gmail test user.
3. Approve the requested Gmail permissions.
4. Copy the full redirected URL or the `code` value.
5. Paste it back into the terminal.

What happens next:

- The token is saved to the path configured in `gmail-api.config.json`.
- A local helper copy is written to `gmail-token.copy.json`.

You usually only need to do this again if the token expires, is revoked, or you switch accounts.

## 3. Use the React Review UI

Run:

```bash
npm run ui
```

Then open:

```text
http://localhost:5174
```

The page fetches fresh Gmail data when it loads. Use the **Refresh** button to fetch again without running `npm run reviewJobs`. Each email has an **Open email** link that opens the source message in Gmail, and each job keeps its **Open job** link.

The UI shows the active filters for each source. You can edit the filter controls and use **Apply filters** to fetch a new filtered result. Use **Save defaults** to write those filter settings to `job-filters.local.json`; future UI refreshes use that local file first and fall back to [`server/src/config.ts`](./server/src/config.ts) when the file does not exist.

### UI and API flow

- `npm run ui` builds [`ui/src`](./ui/src) into `frontend-dist`, then starts [`server/src/server.ts`](./server/src/server.ts).
- The server hosts the React app at `http://localhost:5174`.
- `GET /api/reviews` fetches Gmail using the saved local filters.
- `POST /api/reviews` fetches Gmail using filter values sent from the UI.
- `GET /api/filters` reads the active local filter defaults.
- `POST /api/filters` writes updated filter defaults to `job-filters.local.json`.
- Review responses include total API timing and per-source timing for Gmail fetch, review generation, and filtering.
- Gmail search limits come from `gmail-api.config.json` under `gmailApiConfig.query`.
- Current benchmark query settings are 14 days, 50 messages per source, 3 source workers, and 5 message-detail workers per source.

The UI uses the same local Gmail token configured in [`gmail-api.config.json`](./gmail-api.config.json). If you already have a valid local token, no extra authorization step is needed.

## 4. Create Static Review Files

Run:

```bash
npm run reviewJobs
```

This script runs:

```json
"reviewJobs": "ts-node server/src/index.ts"
```

For debug snapshots (JSON in/out on disk), run:

```bash
npm run reviewJobs:debug
```

This script runs:

```json
"reviewJobs:debug": "ts-node server/src/index.ts --debug"
```

What it does:

- Starts the review flow from [`index.ts`](./server/src/index.ts).
- Connects to Gmail using the configured OAuth files.
- Fetches emails from:
  - `jobalerts-noreply@linkedin.com` (LinkedIn)
  - `noreply@glassdoor.com` (Glassdoor)
  - `jobalert@lensa.com` (Lensa)
- Limits each Gmail source search using `gmailApiConfig.query` in `gmail-api.config.json`.
- Parses job entries from those emails.
- Generates full + filtered HTML review files (per source), for example:
  - `Results/Linked-In-Jobs-Review.html`
  - `Results/Linked-In-Jobs-Review-Filtered.html`
  - `Results/Glassdoor-Jobs-Review.html`
  - `Results/Glassdoor-Jobs-Review-Filtered.html`
  - `Results/Lensa-Jobs-Review.html`
  - `Results/Lensa-Jobs-Review-Filtered.html`
- In normal mode (`reviewJobs`), filtered review uses in-memory objects (no JSON read/write I/O in the pipeline).
- In debug mode (`reviewJobs:debug`), JSON snapshots are also written for inspection:
  - `*-Review.json`
  - `*-Review-Filtered.json`

Filtered review behavior:

- Emails are sorted latest first.
- Duplicate jobs are kept in the latest email only.
- The same jobs are removed from older emails.
- Any email with `0` jobs after filtering is omitted from the filtered output.
- Source-level fallback salary filtering is configured in [`server/src/config.ts`](./server/src/config.ts) (currently applied for Glassdoor and Lensa).

### Run with local sample emails

Run:

```bash
npm run reviewSamples
```

This parses explicit sample files under [`Sample`](./Sample):

- `Sample/LinkedIn.eml`
- `Sample/Glassdoor.eml`
- `Sample/Lensa.eml`

And generates the same review + filtered outputs into [`Results`](./Results).

Open the generated files in [`Results`](./Results) to review the outputs.

## 5. Architecture

The parser layer uses a tiered design to balance source-specific parsing and shared behavior:

- [`BaseJobEmailParser`](./server/src/parsers/BaseJobEmailParser.ts)
  - Shared Gmail-fetch flow.
  - Shared `JobRecord` model.
  - Shared MIME-part extraction for Gmail/sample `.eml` processing.
- [`HtmlJobEmailParser`](./server/src/parsers/HtmlJobEmailParser.ts)
  - Shared HTML-heavy parsing helpers (decode/normalize/html-text fallback).
  - Base tier for HTML-style sources.
- Source parsers:
  - [`LinkedInParser`](./server/src/parsers/LinkedInParser.ts) (plain-text flavor)
  - [`GlassdoorParser`](./server/src/parsers/GlassdoorParser.ts) (hairy HTML flavor)
  - [`LensaParser`](./server/src/parsers/LensaParser.ts) (hairy HTML flavor)

Design intent:

- Keep source flavor logic isolated in child classes.
- Keep shared flow/utilities centralized in base tiers.
- Keep field mapping explicit in parser code through `JobRecord` property setters.

### Cleanup scripts

Useful scripts from [`package.json`](./package.json):

```bash
npm run del:results
npm run del:packages
```

They do the following:

- `del:results`: removes the generated `Results` folder.
- `del:packages`: removes `node_modules`.

## Notes

- If Google returns a 403 during authorization, make sure your Gmail account was added as a test user.
- `npm install` may still show `node-domexception@1.0.0` as deprecated. That warning currently comes from the upstream Google HTTP dependency chain and can be ignored for now.
