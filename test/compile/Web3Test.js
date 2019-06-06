const assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')
const browser = await puppeteer.launch({ headless })
const page = await browser.newPage()

await page.addScriptTag({ path: path.resolve('../../public/embed.min.js') })

describe('# Web3 Test', function() {
  describe('#constructor', function() {
    it('can construct web3', function() {
      // browser.
      assert.strictEqual(page.web3.currentProvider.isTorus, true)
    })
  })
})
