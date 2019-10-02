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
    'https://binancelabs-main-2.tor.us/jrpc',
    'https://waseda-main-2.tor.us/jrpc',
    'https://vgr-main-2.torusnode.com/jrpc',
    'https://torus-main-2.torusnode.com/jrpc',
    'https://etc-main-2.tor.us/jrpc'
  ],
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic'],
  enums: enums,
  verifierList: verifierList,
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD]
}
