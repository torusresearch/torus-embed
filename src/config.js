const enums = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  REDDIT: 'reddit',
  DISCORD: 'discord'
}
const verifierList = Object.values(enums)
export default {
  torusNodeEndpoints: [
    'https://binance-main-3.torusnode.com/jrpc',
    'https://waseda-main-3.torusnode.com/jrpc',
    'https://vgr-main-3.torusnode.com/jrpc',
    'https://torus-main-3.torusnode.com/jrpc',
    'https://etc-main-3.torusnode.com/jrpc'
  ],
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic'],
  enums: enums,
  verifierList: verifierList,
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD]
}
