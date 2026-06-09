import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number(process.argv[2]);
const root = resolve(process.argv[3] || process.cwd());

if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Usage: node tests/e2e/static-server.mjs <port> [root]');
}

const mimeTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml; charset=utf-8'],
    ['.wasm', 'application/wasm']
]);

function resolveRequestPath(urlPath) {
    const decodedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
    const relativePath = normalize(decodedPath === '/' ? '/index.html' : decodedPath).replace(/^([/\\])+/, '');
    const filePath = resolve(join(root, relativePath));
    const rootWithSep = root.endsWith(sep) ? root : root + sep;

    if (filePath !== root && !filePath.startsWith(rootWithSep)) {
        return null;
    }

    return filePath;
}

const server = createServer((req, res) => {
    const filePath = resolveRequestPath(req.url || '/');
    if (!filePath) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const stats = statSync(filePath);
        if (!stats.isFile()) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        const mimeType = mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
        res.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Length': stats.size,
            'Content-Type': mimeType
        });
        createReadStream(filePath).pipe(res);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`OpticsLab smoke server listening on http://127.0.0.1:${port}`);
});
