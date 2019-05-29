var browserify = require('browserify')
var fs = require('fs')
var envify = require('envify/custom')
try {
  var bundler = browserify(__dirname + '/../src/embed.js', {
    fullPaths: true,
    noParse: [require.resolve(__dirname + '/../src/vendor/web3.js'), require.resolve(__dirname + '/../src/vendor/web3.min.js')]
  })

  if (process.env.NODE_ENV !== 'development') {
    bundler.transform('uglifyify', { global: true, keep_fnames: true })
  }
  bundler.transform(
    envify({
      NODE_ENV: process.env.NODE_ENV
    })
  )

  bundler.bundle().pipe(fs.createWriteStream(__dirname + '/../public/embed.min.js'))
} catch (e) {
  console.log(e)
}
