const browserify = require('browserify')
const fs = require('fs')
const path = require('path')
try {
  const bundler = browserify(path.resolve(__dirname, '/../dist/embed.js'), {
    fullPaths: true
  })

  if (process.env.TORUS_BUILD_ENV !== 'development') {
    bundler.transform('uglifyify', { global: true, keep_fnames: true })
  }

  bundler.bundle().pipe(fs.createWriteStream(path.resolve(__dirname, '/../public/embed.min.js')))
} catch (e) {
  console.log(e)
}
