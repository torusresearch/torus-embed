const enums = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  REDDIT: 'reddit',
  DISCORD: 'discord',
  MOONPAY: 'moonpay',
  WYRE: 'wyre'
}

const verifierList = Object.values(enums)

const paymentProviders = {
  [enums.MOONPAY]: {
    line1: 'Credit / Debit Card / Apple Pay',
    line2: '4.5% or 5 USD',
    line3: '2,000€/day, 10,000€/mo',
    supportPage: 'https://help.moonpay.io/en/',
    minOrderValue: 24.99,
    maxOrderValue: 2000,
    validCurrencies: ['USD', 'EUR', 'GBP'],
    validCryptoCurrencies: ['ETH', 'DAI', 'TUSD', 'USDC', 'USDT'],
    includeFees: true
  },
  [enums.WYRE]: {
    line1: 'Apple Pay/Debit Card',
    line2: '1.5% + 30¢',
    line3: '$250/day',
    supportPage: 'https://support.sendwyre.com/en/',
    minOrderValue: 20,
    maxOrderValue: 250,
    validCurrencies: ['USD'],
    validCryptoCurrencies: ['ETH', 'DAI', 'USDC'],
    includeFees: false
  }
}

export default {
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic'],
  enums,
  verifierList,
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD],
  paymentProviders
}
