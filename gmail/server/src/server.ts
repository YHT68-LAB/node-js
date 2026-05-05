import fs from 'fs';
import http from 'http';
import path from 'path';
import { fetchJobReviews } from './jobReviewService';
import { normalizeJobFilters, readJobFilters, writeJobFilters } from './filterStore';

const PORT = Number(process.env.PORT || 5174);
const STATIC_DIR = path.join(__dirname, '../../frontend-dist');

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.svg') {
    response.writeHead(404, {
      'cache-control': 'no-store'
    });
    response.end();
    return;
  }

  if (url.pathname === '/api/reviews') {
    if (request.method !== 'GET' && request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const startedAt = new Date();
      const body = request.method === 'POST' ? await readJsonBody(request) : {};
      const filters = request.method === 'POST'
        ? normalizeJobFilters(isRecord(body) ? body.filters : {})
        : readJobFilters();
      const sources = await fetchJobReviews({
        filters,
        onStatus: message => console.log(message)
      });

      sendJson(response, 200, {
        refreshedAt: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt.getTime(),
        filters,
        sources
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      sendJson(response, 500, { error: message });
    }
    return;
  }

  if (url.pathname === '/api/filters') {
    try {
      if (request.method === 'GET') {
        sendJson(response, 200, { filters: readJobFilters() });
        return;
      }

      if (request.method === 'POST') {
        const body = await readJsonBody(request);
        const filters = writeJobFilters(isRecord(body) ? body.filters : {});
        sendJson(response, 200, { filters });
        return;
      }

      sendJson(response, 405, { error: 'Method not allowed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      sendJson(response, 500, { error: message });
    }
    return;
  }

  serveStaticFile(url.pathname, response);
});

server.listen(PORT, () => {
  console.log(`Job Review UI is running at http://localhost:${PORT}`);
});

function sendJson(response: http.ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) return {};
  return JSON.parse(rawBody);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serveStaticFile(urlPath: string, response: http.ServerResponse): void {
  if (!fs.existsSync(STATIC_DIR)) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('React UI is not built yet. Run npm run ui:build first.');
    return;
  }

  const requestedPath = urlPath === '/' ? '/index.html' : urlPath;
  const absolutePath = path.normalize(path.join(STATIC_DIR, requestedPath));
  const staticRoot = path.normalize(STATIC_DIR);

  if (absolutePath !== staticRoot && !absolutePath.startsWith(`${staticRoot}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  const filePath = fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()
    ? absolutePath
    : path.join(STATIC_DIR, 'index.html');

  const extension = path.extname(filePath);
  response.writeHead(200, {
    'content-type': mimeTypes[extension] || 'application/octet-stream',
    'cache-control': extension === '.html' ? 'no-store' : 'public, max-age=31536000, immutable'
  });
  fs.createReadStream(filePath).pipe(response);
}
