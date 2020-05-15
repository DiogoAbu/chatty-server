import http from 'http';

const options = {
  host: 'localhost',
  port: process.env.PORT,
  path: '/.well-known/apollo/server-health',
  timeout: 2000,
};

const request = http.request(options, (res) => {
  console.log('status: ', res.statusCode);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('error: ', err.message);
  process.exit(1);
});

request.end();
