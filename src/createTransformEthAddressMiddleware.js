const embedUtils = require('./embedUtils')

function CreateTransformEthAddressMiddleware({ override = true } = {}) {
  return (req, res, next, end) => {
    next(function(done) {
      if (req.method === 'eth_accounts') {
        res.result = embedUtils.transformEthAddress(res.result)
      }
      done()
    })
  }
}

module.exports = CreateTransformEthAddressMiddleware
