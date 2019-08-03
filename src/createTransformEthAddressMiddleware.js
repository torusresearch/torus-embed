import { transformEthAddress } from './embedUtils'

function CreateTransformEthAddressMiddleware({ override = true } = {}) {
  return (req, res, next, end) => {
    next(function(done) {
      if (req.method === 'eth_accounts') {
        res.result = transformEthAddress(res.result)
      }
      done()
    })
  }
}

export default CreateTransformEthAddressMiddleware
