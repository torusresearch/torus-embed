var browserify = require('browserify')
var fs = require('fs')
var envify = require('envify/custom')
try {
  var bundler = browserify(__dirname + '/../src/embed.js', {
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

  bundler.bundle().pipe(fs.createWriteStream(__dirname + '/../public/embed.min.js'))
} catch (e) {
  console.log(e)
}
