const assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

describe('# Web3 Test', function() {
  describe('#constructor', function() {
    it('can construct web3', async function() {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      const page = await browser.newPage()
      await page.addScriptTag({ path: path.resolve(__dirname, '../../public/embed.min.js') })
      await sleep(5000)
      assert.strictEqual(
        await page.evaluate(() => {
          return window.web3.currentProvider.isTorus === true
        }),
        true
      )
    })
  })
})

const sleep = milliseconds => {
  return new Promise((resolve, reject) => {
    setTimeout(function() {
      resolve()
    }, milliseconds)
  })
}
