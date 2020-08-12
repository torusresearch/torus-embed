const enums = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  REDDIT: 'reddit',
  DISCORD: 'discord',
}

const paymentEnums = {
  MOONPAY: 'moonpay',
  WYRE: 'wyre',
  RAMPNETWORK: 'rampnetwork',
  XANPOOL: 'xanpool',
}

const paymentProviders = {
  [paymentEnums.RAMPNETWORK]: {
    line1: 'Bank transfer',
    line2: '0% - 2.5%',
    line3: '10,000€/purchase, 10,000€/mo',
    supportPage: 'https://instant.ramp.network/',
    minOrderValue: 1,
    maxOrderValue: 10000,
    validCurrencies: ['GBP', 'EUR'],
    validCryptoCurrencies: ['ETH', 'DAI', 'USDC'],
    includeFees: true,
    enforceMax: false,
  },
  [paymentEnums.MOONPAY]: {
    line1: 'Credit / Debit Card / Apple Pay',
    line2: '4.5% or 5 USD',
    line3: '2,000€/day, 10,000€/mo',
    supportPage: 'https://help.moonpay.io/en/',
    minOrderValue: 24.99,
    maxOrderValue: 50000,
    validCurrencies: ['USD', 'EUR', 'GBP'],
    validCryptoCurrencies: ['ETH', 'DAI', 'TUSD', 'USDC', 'USDT'],
    includeFees: true,
    enforceMax: false,
  },
  [paymentEnums.WYRE]: {
    line1: 'Apple Pay/Debit Card',
    line2: '1.5% + 30¢',
    line3: '$250/day',
    supportPage: 'https://support.sendwyre.com/en/',
    minOrderValue: 20,
    maxOrderValue: 250,
    validCurrencies: ['USD'],
    validCryptoCurrencies: ['ETH', 'DAI', 'USDC'],
    includeFees: false,
    enforceMax: false,
  },
  [paymentEnums.XANPOOL]: {
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

const translations = {
  en: {
    embed: {
      continue: 'Allow pop up to continue',
      actionRequired: 'Unblock pop-up',
      cookiesRequired: 'Cookies Required',
      enableCookies: 'Please enable cookies in your browser preferences to access Torus',
      clickHere: 'More Info',
    },
  },
  de: {
    embed: {
      continue: 'Popup zulassen, um fortzufahren',
      actionRequired: 'Popup entsperren',
      cookiesRequired: 'Cookies benötigt',
      enableCookies: 'Bitte aktivieren Sie Cookies in Ihren Browsereinstellungen, um auf Torus zuzugreifen',
      clickHere: 'Mehr Info',
    },
  },
  ja: {
    embed: {
      continue: 'ポップアップの続行を許可',
      actionRequired: 'ポップアップのブロックを解除',
      cookiesRequired: '必要なクッキー',
      enableCookies: 'Torusにアクセスするには、ブラウザの設定でCookieを有効にしてください。',
      clickHere: 'より詳しい情報',
    },
  },
  ko: {
    embed: {
      continue: '계속하려면 팝업 허용',
      actionRequired: '팝업 차단 해제',
      cookiesRequired: '쿠키 필요',
      enableCookies: '브라우저 환경 설정에서 쿠키를 활성화하여 Torus에 액세스하십시오.',
      clickHere: '더 많은 정보',
    },
  },
  zh: {
    embed: {
      continue: '允许弹出以继续',
      actionRequired: '取消阻止弹出窗口',
      cookiesRequired: '必填Cookie',
      enableCookies: '请在您的浏览器首选项中启用cookie以访问Torus。',
      clickHere: '更多信息',
    },
  },
}

export default {
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic', 'mumbai'],
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD],
  paymentProviders,
  enums,
  api: 'https://api.tor.us',
  translations,
}
