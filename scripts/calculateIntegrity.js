const fs = require('fs')
const path = require('path')
const sriToolbox = require('sri-toolbox')

const embedPath = path.resolve(__dirname, '../public', 'embed.min.js')
const embedFile = fs.readFileSync(embedPath, 'utf8')

const integrity = sriToolbox.generate(
  {
    algorithms: ['sha384']
  },
  embedFile
)

const filesToReplace = ['../public/embed.user.js']

filesToReplace.forEach(filePath => {
  try {
    const reqPath = path.resolve(__dirname, filePath)
    let data = fs.readFileSync(reqPath, 'utf8')
    let index = data.indexOf('sha384-')
    while (index !== -1) {
      const result = data.substr(0, index) + integrity + data.substr(index + integrity.length)
      fs.writeFileSync(reqPath, result, 'utf8')
      index = data.indexOf('sha384-', index + 64 + 7)
      data = result
    }
  } catch (error) {
    console.log(error)
  }
})
