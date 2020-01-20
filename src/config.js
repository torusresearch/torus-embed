const enums = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  REDDIT: 'reddit',
  DISCORD: 'discord'
}
const verifierList = Object.values(enums)
export default {
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic'],
  enums: enums,
  verifierList: verifierList,
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD]
}
