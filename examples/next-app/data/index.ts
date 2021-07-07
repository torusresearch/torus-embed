export const whiteLabelData = {
    theme: {
      isDark: false,
      colors: {
        torusBrand1: '#000000',
        torusGray2: '#FBF7F3',
      },
    },
    logoDark: 'https://startrail.io/images/front/startrail-top__main.svg', // dark logo for light background
    logoLight: 'https://images.toruswallet.io/startrail-logo-light.svg', // light logo for dark background
    topupHide: false,
    featuredBillboardHide: true,
    tncLink: {
      en: 'http://example.com/tnc/en',
      ja: 'http://example.com/tnc/ja',
    },
    privacyPolicy: {
      en: 'http://example.com/tnc/en',
      ja: 'http://example.com/tnc/ja',
    },
    contactLink: {
      en: 'http://example.com/tnc/en',
      ja: 'http://example.com/tnc/ja',
    },
    disclaimerHide: true,
    defaultLanguage: 'en',
    customTranslations: {
      en: {
        // embed: {
        //   continue: 'Continue',
        //   actionRequired: 'Action Required',
        //   pendingAction: 'You have a pending action that needs to be completed in a pop-up window ',
        //   cookiesRequired: 'Cookies Required',
        //   enableCookies: 'Please enable cookies in your browser preferences to access Torus.',
        //   forMoreInfo: 'For more info, ',
        //   clickHere: 'click here',
        // },
        login: {
          acceptTerms: 'By logging in, you accept Examples',
          your: 'Your',
          digitalWallet: 'digital wallet instantly',
          buttonText: 'Login with Startrail',
        },
        dappTransfer: {
          data: 'Data to sign',
        },
        dappPermission: {
          permission: 'Permission',
          requestFrom: 'Request from',
          accessUserInfo: 'To access your Google Email Address, Profile Photo and Name',
        },
      },
      ja: {
        login: {
          acceptTerms: 'ログインすると、Examples を受け入れます',
          your: '君の',
          digitalWallet: 'すぐにデジタルウォレット',
          buttonText: 'Startrailでログイン',
        },
        dappTransfer: {
          data: 'あなたがサインするデータ',
        },
        dappPermission: {
          permission: '下記の内容を許可しますか',
          requestFrom: '許可を求めているアプリケーション',
          accessUserInfo: '受け取る情報: Googleメール、プロフィール写真、名前',
        },
      },
    },
  };
  
  export const getV3TypedData = (chainId: string | number) => ({
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' },
      ],
    },
    primaryType: 'Mail',
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: Number(chainId),
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    },
    message: {
      from: {
        name: 'Cow',
        wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
      },
      to: {
        name: 'Bob',
        wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
      },
      contents: 'Hello, Bob!',
    },
  });
  
  export const getV4TypedData = (chainId: string | number) => ({
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallets', type: 'address[]' },
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person[]' },
        { name: 'contents', type: 'string' },
      ],
      Group: [
        { name: 'name', type: 'string' },
        { name: 'members', type: 'Person[]' },
      ],
    },
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: Number(chainId),
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    },
    primaryType: 'Mail',
    message: {
      from: {
        name: 'Cow',
        wallets: ['0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826', '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF'],
      },
      to: [
        {
          name: 'Bob',
          wallets: [
            '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
            '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
            '0xB0B0b0b0b0b0B000000000000000000000000000',
          ],
        },
      ],
      contents: 'Hello, Bob!',
    },
  });
  