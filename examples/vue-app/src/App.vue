<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <br />
    <button v-if="publicAddress === ''" @click="login">Login</button>
    <button v-if="publicAddress !== ''" @click="changeProvider">Change Provider</button>
    <button v-if="publicAddress !== ''" @click="getUserInfo">Get User Info</button>
    <button v-if="publicAddress !== ''" @click="createPaymentTx">Create Payment Tx</button>
    <button v-if="publicAddress !== ''" @click="logout">Logout</button>
    <br />
    <button v-if="publicAddress !== ''" @click="signMessage">sign_eth</button>
    <button v-if="publicAddress !== ''" @click="signTypedData_v1">sign typed data v1</button>
    <button v-if="publicAddress !== ''" @click="signTypedData_v3">sign typed data v3</button>
    <button v-if="publicAddress !== ''" @click="signTypedData_v4">sign typed data v4</button>
    <div id="console">
      <p></p>
    </div>
  </div>
</template>

<script>
import Torus from '@toruslabs/torus-embed'
import Web3 from 'web3'

export default {
  name: 'app',
  data() {
    return {
      publicAddress: ''
    }
  },
  methods: {
    async login() {
      try {
        const torus = new Torus({
          buttonPosition: 'bottom-left'
        })
        await torus.init({
          buildEnv: 'testing',
          enabledVerifiers: {
            twitch: false
          },
          enableLogging: true,
          network: {
            host: 'rinkeby', // mandatory
            // chainId: 1, // optional
            networkName: 'kovan' // optional
          },
          showTorusButton: true
        })
        await torus.login() // await torus.ethereum.enable()
        const web3 = new Web3(torus.provider)
        window.torus = torus
        web3.eth.getAccounts().then(accounts => {
          this.publicAddress = accounts[0]
          web3.eth.getBalance(accounts[0]).then(console.log)
          // For testing typed messages
          // this.requestFakeSignature()
        })
      } catch (error) {
        console.error(error)
      }
    },
    console(text) {
      document.querySelector('#console>p').innerHTML = text
    },
    createPaymentTx() {
      window.torus.initiateTopup('moonpay').then(console.log).catch(console.log)
    },
    signMessage() {
      const self = this
      // hex message
      const message = '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad'
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_sign',
          params: [window.torus.web3.eth.accounts[0], message],
          from: window.torus.web3.eth.accounts[0]
        },
        function(err, result) {
          if (err) {
            return console.error(err)
          }
          self.console('sign message => true \n', result)
        }
      )
    },
    signTypedData_v1() {
      const typedData = [
        {
          type: 'string',
          name: 'message',
          value: 'Hi, Alice!'
        },
        {
          type: 'uint8',
          name: 'value',
          value: 10
        }
      ]
      const self = this
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_signTypedData',
          params: [typedData, window.torus.web3.eth.accounts[0]],
          from: window.torus.web3.eth.accounts[0]
        },
        function(err, result) {
          if (err) {
            return console.error(err)
          }
          self.console('sign typed message v1 => true \n', result)
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
            { name: 'verifyingContract', type: 'address' }
          ],
          Person: [{ name: 'name', type: 'string' }, { name: 'wallet', type: 'address' }],
          Mail: [{ name: 'from', type: 'Person' }, { name: 'to', type: 'Person' }, { name: 'contents', type: 'string' }]
        },
        primaryType: 'Mail',
        domain: {
          name: 'Ether Mail',
          version: '1',
          chainId: 4,
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
        },
        message: {
          from: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
          },
          to: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
          },
          contents: 'Hello, Bob!'
        }
      }
      const self = this
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_signTypedData_v3',
          params: [window.torus.web3.eth.accounts[0], JSON.stringify(typedData)],
          from: window.torus.web3.eth.accounts[0]
        },
        function(err, result) {
          if (err) {
            return console.error(err)
          }
          self.console('sign typed message v3 => true \n', result)
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
            { name: 'verifyingContract', type: 'address' }
          ],
          Person: [{ name: 'name', type: 'string' }, { name: 'wallets', type: 'address[]' }],
          Mail: [{ name: 'from', type: 'Person' }, { name: 'to', type: 'Person[]' }, { name: 'contents', type: 'string' }],
          Group: [{ name: 'name', type: 'string' }, { name: 'members', type: 'Person[]' }]
        },
        domain: {
          name: 'Ether Mail',
          version: '1',
          chainId: 4,
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
        },
        primaryType: 'Mail',
        message: {
          from: {
            name: 'Cow',
            wallets: ['0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826', '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF']
          },
          to: [
            {
              name: 'Bob',
              wallets: [
                '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
                '0xB0B0b0b0b0b0B000000000000000000000000000'
              ]
            }
          ],
          contents: 'Hello, Bob!'
        }
      }
      const self = this
      window.torus.web3.currentProvider.send(
        {
          method: 'eth_signTypedData_v4',
          params: [window.torus.web3.eth.accounts[0], JSON.stringify(typedData)],
          from: window.torus.web3.eth.accounts[0]
        },
        function(err, result) {
          if (err) {
            return console.error(err)
          }
          self.console('sign typed message v4 => true \n', result)
        }
      )
    },
    logout() {
      window.torus.logout().then(() => (this.publicAddress = ''))
    },
    async changeProvider() {
      await window.torus.setProvider({ host: 'ropsten' })
      console.log('finished changing provider')
    },
    async getUserInfo() {
      const userInfo = await window.torus.getUserInfo()
      console.log(userInfo)
    }
  }
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
