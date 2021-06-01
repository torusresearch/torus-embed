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
  MERCURYO: 'mercuryo',
}

const paymentProviders = {
  [paymentEnums.RAMPNETWORK]: {
    line1: 'Debit Card/ Apple Pay/ Bank transfer',
    line2: '0.49% - 2.9%',
    line3: '5,000€/purchase, 20,000€/mo',
    supportPage: 'https://instant.ramp.network/',
    minOrderValue: 5,
    maxOrderValue: 20000,
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
    line1: 'Apple Pay/ Debit/ Credit Card',
    line2: '4.9% + 30¢ or 5 USD',
    line3: '$250/day',
    supportPage: 'https://support.sendwyre.com/en/',
    minOrderValue: 20,
    maxOrderValue: 500,
    validCurrencies: ['USD'],
    validCryptoCurrencies: ['ETH', 'DAI', 'USDC', 'USDT'],
    includeFees: false,
    enforceMax: false,
  },
  [paymentEnums.XANPOOL]: {
    line1: 'PayNow/ InstaPay/ FPS/ GoJekPay/ UPI/ PromptPay/ VietelPay/ DuitNow',
    line2: '2.5% buying, 3% selling',
    line3: '$2,500 / day',
    supportPage: 'mailto:support@xanpool.com',
    minOrderValue: 100,
    maxOrderValue: 2500,
    validCurrencies: ['SGD', 'HKD', 'MYR', 'PHP', 'INR', 'VND', 'THB', 'IDR'],
    validCryptoCurrencies: ['ETH', 'USDT'],
    includeFees: true,
    sell: true,
    enforceMax: false,
  },
  [paymentEnums.MERCURYO]: {
    line1: 'Credit/ Debit Card/ Apple Pay',
    line2: '3.95% or 4 USD',
    line3: '10,000€/day, 25,000€/mo',
    supportPage: 'mailto:support@mercuryo.io',
    minOrderValue: 30,
    maxOrderValue: 5000,
    validCurrencies: ['USD', 'EUR', 'RUB', 'TRY', 'GBP', 'UAH'],
    validCryptoCurrencies: ['ETH', 'DAI', 'BAT', 'USDT', 'OKB'],
    includeFees: true,
    enforceMax: false,
  },
}

const translations = {
  en: {
    embed: {
      continue: 'Continue',
      actionRequired: 'Authorization required',
      pendingAction: 'Click continue to proceed with your request in a popup',
      cookiesRequired: 'Cookies Required',
      enableCookies: 'Please enable cookies in your browser preferences to access Torus',
      clickHere: 'More Info',
    },
  },
  de: {
    embed: {
      continue: 'Fortsetzen',
      actionRequired: 'Autorisierung erforderlich',
      pendingAction: 'Klicken Sie in einem Popup auf Weiter, um mit Ihrer Anfrage fortzufahren',
      cookiesRequired: 'Cookies benötigt',
      enableCookies: 'Bitte aktivieren Sie Cookies in Ihren Browsereinstellungen, um auf Torus zuzugreifen',
      clickHere: 'Mehr Info',
    },
  },
  ja: {
    embed: {
      continue: '継続する',
      actionRequired: '認証が必要です',
      pendingAction: '続行をクリックして、ポップアップでリクエストを続行します',
      cookiesRequired: '必要なクッキー',
      enableCookies: 'Torusにアクセスするには、ブラウザの設定でCookieを有効にしてください。',
      clickHere: '詳しくは',
    },
  },
  ko: {
    embed: {
      continue: '계속하다',
      actionRequired: '승인 필요',
      pendingAction: '팝업에서 요청을 진행하려면 계속을 클릭하십시오.',
      cookiesRequired: '쿠키 필요',
      enableCookies: '브라우저 환경 설정에서 쿠키를 활성화하여 Torus에 액세스하십시오.',
      clickHere: '더 많은 정보',
    },
  },
  zh: {
    embed: {
      continue: '继续',
      actionRequired: '需要授权',
      pendingAction: '单击继续以在弹出窗口中继续您的请求',
      cookiesRequired: '必填Cookie',
      enableCookies: '请在您的浏览器首选项中启用cookie以访问Torus。',
      clickHere: '更多信息',
    },
  },
}

export default {
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic', 'mumbai', 'bsc_mainnet', 'bsc_testnet', 'xdai'],
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD],
  paymentProviders,
  enums,
  api: 'https://api.tor.us',
  translations,
}
