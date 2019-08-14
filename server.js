/**
 * This express server is only used for local development of torus-embed.
 * Modifications will be required for other purposes.
 */

var express = require('express')
var app = express()
var path = require('path')

const securityHeaderMiddleware = (req, res, next) => {
  // res.setHeader('Content-Security-Policy', 'default-src https: "unsafe-inline"')
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Frame-Options', 'sameorigin')
  next()
}

app.use(securityHeaderMiddleware)

// app.use(express.static(__dirname)); // Current directory is root
app.use(express.static(path.join(__dirname, 'public'))) //  "public" off of current is root

app.listen(3000)
console.log('Listening on port 3000')
