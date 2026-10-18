#!/usr/bin/env python3
"""Local preview with a fixed upstream API proxy; no provider keys required."""
import json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent
UPSTREAM = 'https://loopmove-ai-api.onrender.com'
ROUTES = {'/api/recognize', '/api/arrange', '/api/plan', '/api/dispose'}

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, status, body):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/config.js':
            body = b'window.LOOPMOVE_API_BASE = location.origin;\n'
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

    def do_POST(self):
        # Restrict to local browser origins and fixed known API routes.
        if self.headers.get('Origin') not in (None, 'http://127.0.0.1:8000', 'http://localhost:8000'):
            self.reply(403, b'{"error":"LOCAL_ORIGIN_REQUIRED"}')
            return
        if self.path not in ROUTES:
            self.reply(404, b'{"error":"UNKNOWN_API_ROUTE"}')
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 20 * 1024 * 1024:
                self.reply(413, b'{"error":"INVALID_REQUEST_SIZE"}')
                return
            data = self.rfile.read(length)
            req = Request(UPSTREAM + self.path, data=data, headers={'Content-Type': 'application/json'}, method='POST')
            with urlopen(req, timeout=85) as result:
                self.reply(result.status, result.read())
        except HTTPError as error:
            self.reply(error.code, error.read())
        except (URLError, TimeoutError, OSError):
            self.reply(502, json.dumps({'error':'UPSTREAM_UNAVAILABLE','message':'AI service could not be reached. Please retry.'}).encode())
        except ValueError:
            self.reply(400, b'{"error":"INVALID_REQUEST"}')

if __name__ == '__main__':
    print('LoopMove preview: http://127.0.0.1:8000', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8000), Preview).serve_forever()
