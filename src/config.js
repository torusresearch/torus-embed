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
      continue: 'Continue',
      actionRequired: 'Action Required',
      pendingAction: 'Click continue to proceed with your request ',
      cookiesRequired: 'Cookies Required',
      enableCookies: 'Please enable cookies in your browser preferences to access Torus.',
      forMoreInfo: 'For more info, ',
      clickHere: 'Click here',
    },
  },
  de: {
    embed: {
      continue: 'Fortsetzen',
      actionRequired: 'Handlung erforderlich',
      pendingAction: 'Klicken Sie auf Weiter, um mit Ihrer Anfrage fortzufahren ',
      cookiesRequired: 'Cookies benötigt',
      enableCookies: 'Bitte aktivieren Sie Cookies in Ihren Browsereinstellungen, um auf Torus zuzugreifen.',
      forMoreInfo: 'Für mehr Information, ',
      clickHere: 'Klicke hier',
    },
  },
  ja: {
    embed: {
      continue: '継続する',
      actionRequired: '必要なアクション',
      pendingAction: '続行をクリックしてリクエストを続行します ',
      cookiesRequired: '必要なクッキー',
      enableCookies: 'Torusにアクセスするには、ブラウザの設定でCookieを有効にしてください。',
      forMoreInfo: '詳細については、',
      clickHere: 'ここをクリック',
    },
  },
  ko: {
    embed: {
      continue: '계속하다',
      actionRequired: '필요한 조치',
      pendingAction: '요청을 계속 진행하려면 계속을 클릭하십시오. ',
      cookiesRequired: '쿠키 필요',
      enableCookies: '브라우저 환경 설정에서 쿠키를 활성화하여 Torus에 액세스하십시오.',
      forMoreInfo: '더 많은 정보를 위해서, ',
      clickHere: '여기를 클릭하십시오',
    },
  },
  zh: {
    embed: {
      continue: '继续',
      actionRequired: '需要采取的行动',
      pendingAction: '点击继续以继续您的请求 ',
      cookiesRequired: '必填Cookie',
      enableCookies: '请在您的浏览器首选项中启用cookie以访问Torus。',
      forMoreInfo: '有关更多信息，',
      clickHere: '点击这里',
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
