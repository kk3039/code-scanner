const https = require('https')
const options = {
  hostname: 'www.npmjs.com/',
  port: 443,
  path: '/todos',
  method: 'POST'
}

const req = https.request(options, res => {
  console.log(`status code: ${res.statusCode}`)
  res.on('data', d => {
    process.stdout.write(d)
  })
})

req.on('error', error => {
  console.error(error)
})

req.end()