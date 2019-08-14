const browserify = require('browserify')
const fs = require('fs')
const path = require('path')
var envify = require('envify/custom')
try {
  const bundler = browserify(path.resolve(__dirname, '../public/index.js'), {
    fullPaths: true
  })
  if (process.env.TORUS_BUILD_ENV !== 'development') {
    bundler.transform('uglifyify', { global: true, keep_fnames: true })
  }
  bundler.transform(
    envify({
      TORUS_BUILD_ENV: process.env.TORUS_BUILD_ENV
    })
  )

  bundler.bundle().pipe(fs.createWriteStream(path.resolve(__dirname, '../public/embed.min.js')))
} catch (e) {
  console.log(e)
}
