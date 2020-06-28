<template>
  <div id="app">
    <form @submit.prevent="login">
      <p>Build Environment</p>
      <select name="buildEnv" v-model="buildEnv">
        <option value="production">Production</option>
        <option selected value="staging">Staging</option>
        <option value="testing">Testing</option>
        <option value="development">Development</option>
        <option selected value="lrc">LRC</option>
      </select>
      <button v-if="publicAddress === ''">Login</button>
    </form>
    <br />
    <div v-if="publicAddress !== ''">
      <button @click="getUserInfo">Get User Info</button>
      <button @click="createPaymentTx">Create Payment Tx</button>
      <button @click="sendEth">Send Eth</button>
      <button @click="logout">Logout</button>
      <br />
      <button @click="signMessage">sign_eth</button>
      <button @click="signTypedData_v1">sign typed data v1</button>
      <button @click="signTypedData_v3">sign typed data v3</button>
      <button @click="signTypedData_v4">sign typed data v4</button>
      <button @click="changeProvider">Change Provider</button>
      <button @click="sendDai">Send DAI</button>
      <button @click="approveKnc">Approve Knc</button>
      <div :style="{ marginTop: '20px' }">
        <select name="verifier" :value="selectedVerifier" @change="onSelectedVerifierChanged">
          <option selected value="google">Google</option>
          <option value="reddit">Reddit</option>
          <option value="discord">Discord</option>
        </select>
        <input :style="{ marginLeft: '20px' }" v-model="verifierId" :placeholder="placeholder" />
      </div>
      <button :disabled="!verifierId" :style="{ marginTop: '20px' }" v-if="publicAddress !== ''" @click="getPublicAddress">Get Public Address</button>
    </div>
    <div id="console">
      <p></p>
    </div>
  </div>
</template>

<script>
import Torus from '@toruslabs/torus-embed'
import Web3 from 'web3'

const tokenAbi = require('human-standard-token-abi')

export default {
  name: 'app',
  data() {
    return {
      publicAddress: '',
      verifierId: '',
      selectedVerifier: 'google',
      placeholder: 'Enter google email',
      buildEnv: 'testing',
    }
  },
  methods: {
    onSelectedVerifierChanged(e) {
      this.selectedVerifier = e.target.value
      switch (this.selectedVerifier) {
        case 'google':
          this.placeholder = 'Enter google email'
          break
        case 'reddit':
          this.placeholder = 'Enter reddit username'
          break
        case 'discord':
          this.placeholder = 'Enter Discord ID'
          break
        default:
          break
      }
    },
    async login() {
      try {
        const torus = new Torus({
          buttonPosition: 'bottom-left',
        })
        window.torus = torus
        await torus.init({
          buildEnv: this.buildEnv,
          enabledVerifiers: {
            reddit: false,
          },
          enableLogging: false,
          network: {
            host: 'rinkeby', // mandatory
            chainId: 4,
          },
          showTorusButton: true,
          // integrity: {
          //   check: true,
          //   version: '1.4.2',
          //   hash: 'sha384-jwXOV6VJu+PM89ksbCSZyQRjf5FdX8n39nWfE/iQBMH2r5m027ua2tkQ+83FPdp9'
          // }
          loginConfig: {
            ...(this.buildEnv === 'lrc' && {
              'startrail-auth0-email-password-qa': {
                typeOfLogin: 'email_password',
                description: 'login.buttonText',
                clientId: 'F1NCHy8cV6UfZPTHUwELJZWU2zPsI7Gt',
                logoHover: 'https://s3.amazonaws.com/app.tor.us/startrail-logo-light.svg',
                logoLight: 'https://s3.amazonaws.com/app.tor.us/startrail-logo-light.svg',
                logoDark: 'https://startrail.io/images/front/startrail-top__main.svg',
                showOnModal: true,
                jwtParameters: {
                  domain: 'https://torusstartrail.au.auth0.com',
                  ui_locales: 'ja',
                },
              },
            }),
          },
          whiteLabel: {
            theme: {
              isDark: false,
              colors: {
                torusBrand1: '#000000',
                torusGray2: '#FBF7F3',
              },
            },
            logoDark: 'https://startrail.io/images/front/startrail-top__main.svg', // dark logo for light background
            logoLight: 'https://s3.amazonaws.com/app.tor.us/startrail-logo-light.svg', // light logo for dark background
            topupHide: true,
            featuredBillboardHide: true,
            tncLink: {
              en: 'http://example.com/tnc/en',
              ja: 'http://example.com/tnc/ja',
            },
            defaultLanguage: 'ja',
            customTranslations: {
              en: {
                embed: {
                  continue: 'Continue',
                  actionRequired: 'Action Required',
                  pendingAction: 'You have a pending action that needs to be completed in a pop-up window ',
                  cookiesRequired: 'Cookies Required',
                  enableCookies: 'Please enable cookies in your browser preferences to access Torus.',
                  forMoreInfo: 'For more info, ',
                  clickHere: 'click here',
                },
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
          },
        })
        await torus.login() // await torus.ethereum.enable()
        const web3 = new Web3(torus.provider)
        torus.provider.on('chainChanged', (resp) => console.log(resp, 'chainchanged'))
        window.web3 = web3
        const accounts = await web3.eth.getAccounts()
        ;[this.publicAddress] = accounts
        web3.eth.getBalance(accounts[0]).then(console.log).catch(console.error)
      } catch (error) {
        console.error(error)
      }
    },
    console(text) {
      document.querySelector('#console>p').innerHTML = typeof text === 'object' ? JSON.stringify(text) : text
    },
    createPaymentTx() {
      window.torus
        .initiateTopup('moonpay', {
          selectedCurrency: 'USD',
        })
        .then(console.log)
        .catch(console.error)
    },
    sendEth() {
      window.web3.eth.sendTransaction({ from: this.publicAddress, to: this.publicAddress, value: window.web3.utils.toWei('0.01') })
    },
    signMessage() {
      const self = this
      // hex message
      const message = '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad'
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_sign',
          params: [this.publicAddress, message],
          from: this.publicAddress,
        },
        (err, result) => {
          if (err) {
            return console.error(err)
          }
          return self.console('sign message => true \n', result)
        }
      )
    },
    signTypedData_v1() {
      const typedData = [
        {
          type: 'string',
          name: 'message',
          value: 'Hi, Alice!',
        },
        {
          type: 'uint8',
          name: 'value',
          value: 10,
        },
      ]
      const self = this
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_signTypedData',
          params: [typedData, this.publicAddress],
          from: this.publicAddress,
        },
        (err, result) => {
          if (err) {
            return console.error(err)
          }
          return self.console('sign typed message v1 => true \n', result)
        }
      )
    },

    signTypedData_v3() {
      const typedData = {
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
          chainId: 4,
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
      }
      const self = this
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_signTypedData_v3',
          params: [this.publicAddress, JSON.stringify(typedData)],
          from: this.publicAddress,
        },
        (err, result) => {
          if (err) {
            return console.error(err)
          }
          return self.console('sign typed message v3 => true \n', result)
        }
      )
    },
    signTypedData_v4() {
      const typedData = {
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
          chainId: 4,
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
      }
      const self = this
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_signTypedData_v4',
          params: [this.publicAddress, JSON.stringify(typedData)],
          from: this.publicAddress,
        },
        (err, result) => {
          if (err) {
            return console.error(err)
          }
          return self.console('sign typed message v4 => true \n', result)
        }
      )
    },
    logout() {
      window.torus
        .logout()
        .then(() => {
          this.publicAddress = ''
          return undefined
        })
        .catch(console.error)
    },
    changeProvider() {
      window.torus.setProvider({ host: 'ropsten' }).then(this.console).catch(this.console)
    },
    sendDai() {
      window.torus
        .setProvider({ host: 'mainnet' })
        .then(() => {
          const localWeb3 = window.web3
          const instance = new localWeb3.eth.Contract(tokenAbi, '0x6b175474e89094c44da98b954eedeac495271d0f')
          const value = Math.floor(parseFloat(0.01) * 10 ** parseFloat(18)).toString()
          return instance.methods.transfer(this.publicAddress, value).send(
            {
              from: this.publicAddress,
            },
            (err, hash) => {
              if (err) this.console(err)
              else this.console(hash)
            }
          )
        })
        .catch(console.error)
    },
    approveKnc() {
      window.torus
        .setProvider({ host: 'mainnet' })
        .then(() => {
          const localWeb3 = window.web3
          const instance = new localWeb3.eth.Contract(tokenAbi, '0xdd974D5C2e2928deA5F71b9825b8b646686BD200')
          const value = Math.floor(parseFloat(0.01) * 10 ** parseFloat(18)).toString()
          return instance.methods.approve(this.publicAddress, value).send(
            {
              from: this.publicAddress,
            },
            (err, hash) => {
              if (err) this.console(err)
              else this.console(hash)
            }
          )
        })
        .catch(console.error)
    },
    async getUserInfo() {
      window.torus.getUserInfo().then(this.console).catch(this.console)
    },
    getPublicAddress() {
      console.log(this.selectedVerifier, this.verifierId)
      window.torus.getPublicAddress({ verifier: this.selectedVerifier, verifierId: this.verifierId }).then(this.console).catch(console.error)
    },
  },
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
#console {
  border: 1px solid black;
  height: 40px;
  padding: 2px;
  bottom: 10px;
  position: absolute;
  text-align: left;
  width: calc(100% - 20px);
  border-radius: 5px;
}
#console::before {
  content: 'Console :';
  position: absolute;
  top: -20px;
  font-size: 12px;
}
#console > p {
  margin: 0.5em;
}
button {
  height: 25px;
  margin: 5px;
  background: none;
  border-radius: 5px;
}
</style>
