<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <br />
    <button v-if="publicAddress === ''" @click="login">Login</button>
    <button v-if="publicAddress !== ''" @click="changeProvider">Change Provider</button>
    <button v-if="publicAddress !== ''" @click="getUserInfo">Get User Info</button>
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
import sigUtil from 'eth-sig-util'

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
          buildEnv: 'development',
          enableLogging: true,
          network: {
            host: 'rinkeby', // mandatory
            // chainId: 1, // optional
            networkName: 'kovan' // optional
          },
          showTorusButton: false
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
    signMessage() {
      const address = '0x29c76e6ad8f28bb1004902578fb108c507be341b'
      const privKeyHex = '4af1bceebf7f3634ec3cff8a2c38e51178d5d4ce585c52d6043e5e2cc3418bb0'
      const privKey = Buffer.from(privKeyHex, 'hex')
      const message = 'Hello, world!'
      const msgParams = { data: message }

      const signed = sigUtil.personalSign(privKey, msgParams)
      msgParams.sig = signed
      const recovered = sigUtil.recoverPersonalSignature(msgParams)
      console.log(recovered == address)
      this.console('sign message => ' + (recovered == address))
    },
    signTypedData_v1() {
      const address = '0x29c76e6ad8f28bb1004902578fb108c507be341b'
      const privKeyHex = '4af1bceebf7f3634ec3cff8a2c38e51178d5d4ce585c52d6043e5e2cc3418bb0'
      const privKey = Buffer.from(privKeyHex, 'hex')
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
      const msgParams = { data: typedData }
      const signature = sigUtil.signTypedDataLegacy(privKey, msgParams)
      const recovered = sigUtil.recoverTypedSignatureLegacy({ data: msgParams.data, sig: signature })
      this.console('sign typed message v1 => ' + (recovered == address))
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
          self.console('sign typed message v3 => true')
          const signature = result.result.substring(2)
          const r = '0x' + signature.substring(0, 64)
          const s = '0x' + signature.substring(64, 128)
          const v = parseInt(signature.substring(128, 130), 16)
          // The signature is now comprised of r, s, and v.
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
          // console.log(result)
          self.console('sign typed message v4 => true')

          const signature = result.result.substring(2)
          const r = '0x' + signature.substring(0, 64)
          const s = '0x' + signature.substring(64, 128)
          const v = parseInt(signature.substring(128, 130), 16)
          // The signature is now comprised of r, s, and v.
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
