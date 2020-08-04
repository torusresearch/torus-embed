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
      continue: 'Allow pop-ups',
      cancel: 'Continue Blocking',
      actionRequired: 'Unblock pop-ups',
      pendingAction: 'Please allow pop-ups to continue with the sign in',
      cookiesRequired: 'Cookies Required',
      enableCookies: 'Please enable cookies in your browser preferences to access Torus',
      clickHere: 'More Info',
    },
  },
  de: {
    embed: {
      continue: 'Popups zulassen',
      cancel: 'Weiter blockieren',
      actionRequired: 'Popups entsperren',
      pendingAction: 'Bitte erlauben Sie Popups, mit der Anmeldung fortzufahren',
      cookiesRequired: 'Cookies benötigt',
      enableCookies: 'Bitte aktivieren Sie Cookies in Ihren Browsereinstellungen, um auf Torus zuzugreifen',
      forMoreInfo: 'Für mehr Information, ',
      clickHere: 'Mehr Info',
    },
  },
  ja: {
    embed: {
      continue: 'ポップアップを許可する',
      cancel: 'ブロックを続行',
      actionRequired: 'ポップアップのブロックを解除する',
      pendingAction: 'ログインを続行するにはポップアップを許可してください',
      cookiesRequired: '必要なクッキー',
      enableCookies: 'Torusにアクセスするには、ブラウザの設定でCookieを有効にしてください。',
      clickHere: 'より詳しい情報',
    },
  },
  ko: {
    embed: {
      continue: '팝업 허용',
      cancel: '계속 차단',
      actionRequired: '팝업 차단 해제',
      pendingAction: '로그인이 계속되도록 팝업을 허용하십시오',
      cookiesRequired: '쿠키 필요',
      enableCookies: '브라우저 환경 설정에서 쿠키를 활성화하여 Torus에 액세스하십시오.',
      clickHere: '더 많은 정보',
    },
  },
  zh: {
    embed: {
      continue: '允许弹出窗口',
      cancel: '继续封锁',
      actionRequired: '取消阻止弹出窗口',
      pendingAction: '请允许弹出窗口继续登录 ',
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
