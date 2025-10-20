const http = require('http');
const options = { hostname: '127.0.0.1', port: 3000, path: '/', method: 'GET', timeout: 3000 };
const req = http.request(options, res => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('LENGTH:', data.length);
    process.exit(0);
  });
});
req.on('error', e => { console.error('ERROR', e.message); process.exit(2); });
req.end();
