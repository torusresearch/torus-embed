<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <button v-if="publicAddress === ''" @click="login">Login</button>
    <button v-if="publicAddress !== ''" @click="changeProvider">Change Provider</button>
    <button v-if="publicAddress !== ''" @click="getUserInfo">Get User Info</button>
    <button v-if="publicAddress !== ''" @click="logout">Logout</button>
  </div>
</template>

<script>
import Torus from '@toruslabs/torus-embed'
import Web3 from 'web3'

export default {
  name: 'app',
  data() {
    return {
      publicAddress: '',
      torus: {}
    }
  },
  methods: {
    async login() {
      try {
        this.torus = new Torus()
        await this.torus.init('development', true)
        await this.torus.login() // await this.torus.ethereum.enable()
        const web3 = new Web3(this.torus.provider)
        web3.eth.getAccounts().then(accounts => {
          this.publicAddress = accounts[0]
          web3.eth.getBalance(accounts[0]).then(console.log)

          // For testing typed messages
          // this.requestFakeSignature()
        })
        window.torus = this.torus
      } catch (error) {
        console.error(error)
      }
    },
    requestFakeSignature() {
      const domain = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
        { name: 'salt', type: 'bytes32' }
      ]
      const bid = [{ name: 'amount', type: 'uint256' }, { name: 'bidder', type: 'Identity' }]
      const identity = [{ name: 'userId', type: 'uint256' }, { name: 'wallet', type: 'address' }]
      var message = {
        amount: 100,
        bidder: {
          userId: 323,
          wallet: '0x33asdf3333333333333333333333333333333333333',
          bidder2: {
            userId: 323,
            wallet: '0x33asdf3333333333333333333333333333333333333',
            bidder: {
              userId: 323,
              wallet: '0x33asdf3333333333333333333333333333333333333',
              bidder: {
                userId: 323,
                wallet: '0x33asdf3333333333333333333333333333333333333',
                bidder: {
                  userId: 323,
                  wallet: '0x33asdf3333333333333333333333333333333333333'
                }
              },
              bidder: {
                userId: 323,
                wallet: '0x33asdf3333333333333333333333333333333333333'
              }
            }
          },
          bidder: {
            userId: 323,
            wallet: '0x33asdf3333333333333333333333333333333333333'
          },
          bidder: {
            userId: 323,
            wallet: '0x33asdf3333333333333333333333333333333333333'
          }
        }
      }
      const domainData = {
        name: 'My vuejs test dapp for torus',
        version: '1',
        chainId: parseInt(this.torus.web3.version.network, 10),
        verifyingContract: '0x1C56346CD2A2Bf3202F771f50d3D14a367B48070',
        salt: '0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558'
      }

      const data = JSON.stringify({
        types: {
          EIP712Domain: domain,
          Bid: bid,
          Identity: identity
        },
        domain: domainData,
        primaryType: 'Bid',
        message: message
      })

      this.torus.web3.currentProvider.sendAsync(
        {
          method: 'eth_signTypedData_v3',
          params: [this.torus.web3.eth.accounts[0], data],
          from: this.torus.web3.eth.accounts[0]
        },
        function(err, result) {
          if (err) {
            return console.error(err)
          }
          console.log(result)
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
    changeProvider() {
      window.torus.setProvider('rinkeby')
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
</style>
