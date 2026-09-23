const http = require('http');
const fs = require('fs');
const path = require('path');

const staticDir = path.join(__dirname, '../static');
const types = { '.html': 'text/html', '.js': 'text/javascript' };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
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
}).listen(3000, '127.0.0.1', () => console.log('Server running at http://127.0.0.1:3000/'));
