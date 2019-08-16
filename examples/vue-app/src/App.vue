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
import Torus from "@toruslabs/torus-embed";
import Web3 from "web3";

export default {
  name: "app",
  data() {
    return {
      publicAddress: ''
    }
  },
  methods: {
    async login() {
      try {
        const torus = new Torus();
        await torus.init();
        await torus.login(); // await torus.ethereum.enable()
        const web3 = new Web3(torus.provider);
        web3.eth.getAccounts().then(accounts => {
          this.publicAddress = accounts[0]
          web3.eth.getBalance(accounts[0]).then(console.log)
        });
        window.torus = torus
      } catch (error) {
        console.error(error);
      }
    },
    logout() {
      window.torus.logout().then(() => this.publicAddress = '')
    },
    changeProvider() {
      window.torus.setProvider('rinkeby')
    },
    async getUserInfo() {
      const userInfo = await window.torus.getUserInfo()
      console.log(userInfo)
    }
  }
};
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
