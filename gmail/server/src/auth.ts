import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';

const CONFIG_PATH = path.join(__dirname, '../../gmail-api.config.json');
const configJson = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const config = configJson.gmailApiConfig.paths;

export interface GmailQueryConfig {
  newerThan: string;
  maxResultsPerSource: number;
  sourceConcurrency: number;
  messageDetailConcurrency: number;
}

export function getGmailQueryConfig(): GmailQueryConfig {
  const queryConfig = configJson.gmailApiConfig.query ?? {};
  return {
    newerThan: typeof queryConfig.newerThan === 'string' && queryConfig.newerThan.trim()
      ? queryConfig.newerThan.trim()
      : '14d',
    maxResultsPerSource: toPositiveInteger(queryConfig.maxResultsPerSource, 50),
    sourceConcurrency: toPositiveInteger(queryConfig.sourceConcurrency, 3),
    messageDetailConcurrency: toPositiveInteger(queryConfig.messageDetailConcurrency, 1)
  };
}

export async function getGmailClient() {
  const tokenPath = config.token;

  if (!fs.existsSync(tokenPath)) {
    throw new Error(`Token not found at ${tokenPath}. Run manageToken.ts first.`);
  }

  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

  const credentials = JSON.parse(fs.readFileSync(config.clientSecret, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);

  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

function toPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return fallback;
  return value;
}
