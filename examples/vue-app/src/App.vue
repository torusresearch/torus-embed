<template>
  <div id="app">
    <form @submit.prevent="login">
      <p>Build Environment</p>
      <select name="buildEnv" v-model="buildEnv">
        <option value="production">Production</option>
        <option selected value="staging">Staging</option>
        <option value="testing">Testing</option>
        <option value="development">Development</option>
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
      <div>
        <select name="verifier" :value="selectedVerifier" @change="onSelectedVerifierChanged">
          <option selected value="google">Google</option>
          <option value="reddit">Reddit</option>
          <option value="discord">Discord</option>
        </select>
        <input :style="{marginLeft: '20px'}" v-model="verifierId" :placeholder="placeholder" />
      </div>
      <button v-if="publicAddress !== ''" @click="getPublicAddress">Get Public Address</button>
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
      placeholder: '',
      buildEnv: 'testing'
    }
  },
  methods: {
    onSelectedVerifierChanged(val) {
      this.selectedVerifier = val
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
        buttonPosition: 'bottom-left'
      })
      window.torus = torus
      await torus.init({
        buildEnv: this.buildEnv,
        enabledVerifiers: {
          reddit: false
        },
        enableLogging: false,
        network: {
          host: 'rinkeby', // mandatory
          chainId: 4
        },
        showTorusButton: true
      })
        await torus.login() // await torus.ethereum.enable()
        const web3 = new Web3(torus.provider)
        window.web3 = web3
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
      window.torus
        .initiateTopup('moonpay', {
          selectedCurrency: 'USD'
        })
        .finally(console.log)
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
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' }
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person' },
            { name: 'contents', type: 'string' }
          ]
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
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallets', type: 'address[]' }
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person[]' },
            { name: 'contents', type: 'string' }
          ],
          Group: [
            { name: 'name', type: 'string' },
            { name: 'members', type: 'Person[]' }
          ]
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
      window.torus.cleanUp().then(() => (this.publicAddress = ''))
    },
    changeProvider() {
      window.torus.setProvider({ host: 'ropsten' }).finally(console.log)
    },
    sendDai() {
      window.torus.setProvider({ host: 'mainnet' }).finally(() => {
        const localWeb3 = window.web3
        const instance = new localWeb3.eth.Contract(tokenAbi, '0x6b175474e89094c44da98b954eedeac495271d0f')
        const value = Math.floor(parseFloat(0.01) * 10 ** parseFloat(18)).toString()
        instance.methods.transfer(this.publicAddress, value).send(
          {
            from: this.publicAddress
          },
          (err, hash) => {
            if (err) this.console(err)
            this.console(hash)
          }
        )
      })
    },
    async getUserInfo() {
      window.torus.getUserInfo().finally(console.log)
    },
    getPublicAddress() {
      console.log(this.selectedVerifier, this.verifierId)
      window.torus.getPublicAddress({ verifier: this.selectedVerifier, verifierId: this.verifierId }).then(this.console)
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
