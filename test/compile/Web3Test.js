const assert = require('assert')
const MockBrowser = require('mock-browser').mocks.MockBrowser
global.window = new MockBrowser().getWindow()
require('../../public/embed.min.js')

describe('# Web3 Test', function() {
  describe('#constructor', function() {
    it('can construct web3', function() {
      assert.strictEqual(global.window.web3.currentProvider.isTorus, true)
    })
  })
})
