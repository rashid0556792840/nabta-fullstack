// Unit 3 lab: a plain Node.js server with NO Express.
// Shows the core HTTP module, the URL module and the File System module.
// Run:  node labs/01-http-url-fs.js   then open http://localhost:3001/?name=Nabta
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3001;
const NOTES_FILE = path.join(__dirname, 'lab-notes.txt');

const server = http.createServer((req, res) => {
  // URL module: split the request into path and query parameters
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    const name = (url.searchParams.get('name') || 'visitor').replace(/[<>&"']/g, '');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Hello, ${name}!</h1>
      <p>Try <a href="/time">/time</a>, <a href="/notes">/notes</a>, or POST text to /notes.</p>`);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/time') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ now: new Date().toISOString() }));
    return;
  }

  // File System: read the notes file
  if (req.method === 'GET' && url.pathname === '/notes') {
    fs.readFile(NOTES_FILE, 'utf8', (err, text) => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(err ? 'No notes yet.' : text);
    });
    return;
  }

  // File System: append the request body to the notes file
  if (req.method === 'POST' && url.pathname === '/notes') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) req.destroy(); // basic protection against huge bodies
    });
    req.on('end', () => {
      fs.appendFile(NOTES_FILE, `${new Date().toISOString()} ${body.trim()}\n`, (err) => {
        res.writeHead(err ? 500 : 201, { 'Content-Type': 'text/plain' });
        res.end(err ? 'Could not save note.' : 'Note saved.');
      });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => console.log(`Lab server on http://localhost:${PORT}`));
