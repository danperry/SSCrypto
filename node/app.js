const http = require('http');
const fs = require('fs');
const path = require('path');

const staticDir = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // Temporary: lets the page save the tree to tree.json on disk.
  if (req.method === 'PUT' && url === '/tree.json') return saveTree(req, res);

  const file = path.join(staticDir, url === '/' ? 'index.html' : url);

  if (!file.startsWith(staticDir)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', types[path.extname(file)] || 'text/plain');
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Server running at http://127.0.0.1:${port}/`));

function saveTree(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 10000000) req.destroy(); // 10 MB is plenty for now
  });
  req.on('end', () => {
    try {
      JSON.parse(body);
    } catch (error) {
      res.statusCode = 400;
      return res.end('Not JSON');
    }
    fs.writeFile(path.join(staticDir, 'tree.json'), body, err => {
      res.statusCode = err ? 500 : 200;
      res.end(err ? 'Could not save' : 'Saved');
    });
  });
}
