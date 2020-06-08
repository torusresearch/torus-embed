const enums = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  REDDIT: 'reddit',
  DISCORD: 'discord',
  GITHUB: 'github',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  WEIBO: 'weibo',
  EMAIL_PASSWORD: 'email_password',
  PASSWORDLESS: 'passwordless',
  JWT: 'jwt',
}

const typesOfLoginList = Object.values(enums)

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
    enforceMax: true,
  },
  [paymentEnums.MOONPAY]: {
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
    enforceMax: true,
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
      confirm: 'Confirm',
      actionRequired: 'Action Required',
      pendingAction: 'You have a pending action that needs to be completed in a pop-up window ',
      cookiesRequired: 'Cookies Required',
      enableCookies: 'Please enable cookies in your browser preferences to access Torus.',
      forMoreInfo: 'For more info, ',
      clickHere: 'Click here',
    },
  },
  de: {
    embed: {
      confirm: 'Bestätigen',
      actionRequired: 'Handlung erforderlich',
      pendingAction: 'Sie haben eine ausstehende Aktion, die in einem Popup-Fenster ausgeführt werden muss ',
      cookiesRequired: 'Cookies benötigt',
      enableCookies: 'Bitte aktivieren Sie Cookies in Ihren Browsereinstellungen, um auf Torus zuzugreifen.',
      forMoreInfo: 'Für mehr Information, ',
      clickHere: 'Klicke hier',
    },
  },
  ja: {
    embed: {
      confirm: '確認',
      actionRequired: '必要なアクション',
      pendingAction: 'ポップアップウィンドウで完了する必要がある保留中のアクションがあります ',
      cookiesRequired: '必要なクッキー',
      enableCookies: 'Torusにアクセスするには、ブラウザの設定でCookieを有効にしてください。',
      forMoreInfo: '詳細については、',
      clickHere: 'ここをクリック',
    },
  },
  ko: {
    embed: {
      confirm: '확인',
      actionRequired: '필요한 조치',
      pendingAction: '팝업 창에서 완료해야하는 보류중인 조치가 있습니다. ',
      cookiesRequired: '쿠키 필요',
      enableCookies: '브라우저 환경 설정에서 쿠키를 활성화하여 Torus에 액세스하십시오.',
      forMoreInfo: '더 많은 정보를 위해서, ',
      clickHere: '여기를 클릭하십시오',
    },
  },
  zh: {
    embed: {
      confirm: '确认',
      actionRequired: '需要采取的行动',
      pendingAction: '您有一个待处理的操作，需要在弹出窗口中完成 ',
      cookiesRequired: '必填Cookie',
      enableCookies: '请在您的浏览器首选项中启用cookie以访问Torus。',
      forMoreInfo: '有关更多信息，',
      clickHere: '点击这里',
    },
  },
}

export default {
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic'],
  enums,
  typesOfLoginList,
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD],
  paymentProviders,
  api: 'https://api.tor.us',
  translations,
}
