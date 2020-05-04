const enums = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  REDDIT: 'reddit',
  DISCORD: 'discord',
  MOONPAY: 'moonpay',
  WYRE: 'wyre',
  RAMPNETWORK: 'rampnetwork',
  XANPOOL: 'xanpool',
}

const verifierList = Object.values(enums)

const paymentProviders = {
  [enums.RAMPNETWORK]: {
    line1: 'Bank transfer',
    line2: '0% - 2.5%',
    line3: '10,000€/purchase, 10,000€/mo',
    supportPage: 'https://instant.ramp.network/',
    minOrderValue: 1,
    maxOrderValue: 10000,
    validCurrencies: ['GBP', 'EUR'],
    validCryptoCurrencies: ['ETH', 'DAI', 'USDC'],
    includeFees: true,
    enforceMax: true,
  },
  [enums.MOONPAY]: {
    line1: 'Credit / Debit Card / Apple Pay',
    line2: '4.5% or 5 USD',
    line3: '2,000€/day, 10,000€/mo',
    supportPage: 'https://help.moonpay.io/en/',
    minOrderValue: 24.99,
    maxOrderValue: 2000,
    validCurrencies: ['USD', 'EUR', 'GBP'],
    validCryptoCurrencies: ['ETH', 'DAI', 'TUSD', 'USDC', 'USDT'],
    includeFees: true,
    enforceMax: true,
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
    includeFees: false,
    enforceMax: true,
  },
  [enums.XANPOOL]: {
    line1: 'PayNow/ InstaPay/ FPS/ GoJekPay/ UPI/ PromptPay/ VietelPay/ DuitNow',
    line2: '2.5% buying, 3% selling',
    line3: '$2,500 / day',
    supportPage: 'mailto:support@xanpool.com',
    minOrderValue: 30,
    maxOrderValue: 2500,
    validCurrencies: ['SGD', 'HKD', 'MYR', 'PHP', 'INR', 'VND', 'THB', 'IDR'],
    validCryptoCurrencies: ['ETH', 'USDT'],
    includeFees: true,
    sell: true,
    enforceMax: false,
  },
}

export default {
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic'],
  enums,
  verifierList,
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD],
  paymentProviders,
  api: 'https://api.tor.us',
}
