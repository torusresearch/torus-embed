<template>
  <div id="app">
    <h3>Login With Torus</h3>
    <section>
      <p>
        Build Environment :
        <i>{{ this.buildEnv }}</i>
      </p>
      <div v-if="publicAddress === ''">
        <select name="buildEnv" v-model="buildEnv">
          <option value="production">Production</option>
          <option value="binance">Binance</option>
          <option selected value="testing">Testing</option>
          <option value="development">Development</option>
          <option value="lrc">LRC</option>
          <option value="beta">Beta</option>
        </select>
        <button @click="login">Login</button>
      </div>
      <button v-else @click="logout">Logout</button>
    </section>
    <section
      :style="{
        fontSize: '12px',
      }"
      v-if="publicAddress !== ''"
    >
      <section>
        <div>
          Public Address:
          <i>{{ this.publicAddress }}</i>
        </div>
        <div>
          Network:
          <i>{{ this.chainIdNetworkMap[this.chainId] }}</i>
        </div>
      </section>
      <section :style="{ marginTop: '20px' }">
        <h4>Torus Specific Info</h4>
        <button @click="toggleTorusWidget">Show/Hide Torus Button</button>
        <button @click="getUserInfo">Get User Info</button>
        <button @click="createPaymentTx">Create Payment Tx</button>
        <button @click="changeProvider">Change Provider</button>
        <div :style="{ marginTop: '20px' }">
          <select name="verifier" :value="selectedVerifier" @change="onSelectedVerifierChanged">
            <option selected value="google">Google</option>
            <option value="reddit">Reddit</option>
            <option value="discord">Discord</option>
          </select>
          <input :style="{ marginLeft: '20px' }" v-model="verifierId" :placeholder="placeholder" />
        </div>
        <button :disabled="!verifierId" :style="{ marginTop: '20px' }" @click="getPublicAddress">Get Public Address</button>
      </section>
      <section :style="{ marginTop: '20px' }">
        <h4>Blockchain Apis</h4>
        <section>
          <h5>Signing</h5>
          <button @click="signMessageWithoutPopup">sign_eth_no_popup</button>
          <button @click="signPersonalMsg">personal_sign</button>
          <button @click="signMessage">sign_eth</button>
          <button @click="signTypedData_v1">sign typed data v1</button>
          <button @click="signTypedData_v3">sign typed data v3</button>
          <button @click="signTypedData_v4">sign typed data v4</button>
        </section>
        <section>
          <h5>Transactions</h5>
          <button @click="sendEth">Send Eth</button>
          <button @click="sendDai">Send DAI</button>
          <button @click="approveKnc">Approve Knc</button>
        </section>
        <section>
          <h5>Encrypt / Decrypt</h5>
          <button @click="getEncryptionKey">Get Encryption Key</button>
          <div>
            <input :style="{ marginReft: '20px' }" v-model="messageToEncrypt" placeholder="Message to encrypt" />
            <button :disabled="!encryptionKey" @click="encryptMessage">Encrypt</button>
          </div>
          <button :disabled="!messageEncrypted" @click="decryptMessage">Decrypt</button>
        </section>
      </section>
    </section>
    <div id="console" style="white-space: pre-line">
      <p style="white-space: pre-line"></p>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Torus, { TORUS_BUILD_ENV_TYPE, VerifierArgs } from "@toruslabs/torus-embed";
import { getV3TypedData, getV4TypedData, whiteLabelData } from "./data";
import { encrypt, recoverTypedMessage } from "eth-sig-util";
import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import web3Obj from "./helpers";
import tokenAbi from "human-standard-token-abi";

export default Vue.extend({
  name: "app",
  data() {
    return {
      publicAddress: "",
      chainId: 4,
      verifierId: "",
      selectedVerifier: "google",
      placeholder: "Enter google email",
      chainIdNetworkMap: {
        1: "mainnet",
        3: "ropsten",
        4: "rinkeby",
        5: "goerli",
        42: "kovan",
        97: "bsc_testnet",
        56: "bsc_mainnet",
      } as Record<string, string>,
      messageToEncrypt: "",
      encryptionKey: "",
      messageEncrypted: "",
      buildEnv: "testing" as TORUS_BUILD_ENV_TYPE,
    };
  },
  mounted() {
    const torus = new Torus({
      apiKey: "torus-default",
      buttonPosition: "bottom-left",
    });
    web3Obj.torus = torus;
  },
  methods: {
    onSelectedVerifierChanged(e: Event) {
      this.selectedVerifier = (<HTMLSelectElement>e.target).value;
      switch (this.selectedVerifier) {
        case "google":
          this.placeholder = "Enter google email";
          break;
        case "reddit":
          this.placeholder = "Enter reddit username";
          break;
        case "discord":
          this.placeholder = "Enter Discord ID";
          break;
        default:
          break;
      }
    },
    async login() {
      try {
        const { torus, web3 } = web3Obj;
        await torus?.init({
          buildEnv: this.buildEnv,
          enabledVerifiers: {
            reddit: false,
          },
          enableLogging: true,
          network: {
            host: this.chainIdNetworkMap[this.chainId], // mandatory
            chainId: this.chainId,
            // chainId: 336,
            // networkName: 'DES Network',
            // host: 'https://quorum.block360.io/https',
            // ticker: 'DES',
            // tickerName: 'DES Coin',
          },
          showTorusButton: true,
          integrity: {
            version: "1.11.0",
            check: true,
            // version: '1.4.2',
            // hash: 'sha384-jwXOV6VJu+PM89ksbCSZyQRjf5FdX8n39nWfE/iQBMh4r5m027ua2tkQ+83FPdp9'
          },
          loginConfig:
            this.buildEnv === "lrc"
              ? {
                  "torus-auth0-email-passwordless": {
                    name: "torus-auth0-email-passwordless",
                    typeOfLogin: "passwordless",
                    showOnModal: false,
                  },
                }
              : undefined,
          whiteLabel: whiteLabelData,
          skipTKey: true,
        });
        await torus?.login(); // await torus.ethereum.enable()
        web3Obj.setweb3(torus?.provider);
        torus?.provider.on("chainChanged", (resp) => {
          console.log(resp, "chainchanged");
          this.chainId = parseInt(resp as string);
        });
        torus?.provider.on("accountsChanged", (accounts) => {
          console.log(accounts, "accountsChanged");
          this.publicAddress = (Array.isArray(accounts) && accounts[0]) || "";
        });
        const accounts = await web3.eth.getAccounts();
        [this.publicAddress] = accounts;
        web3.eth.getBalance(accounts[0]).then(console.log).catch(console.error);
      } catch (error) {
        console.error(error, "caught in vue-app");
      }
    },
    toggleTorusWidget() {
      const { torus } = web3Obj;
      if (torus?.torusWidgetVisibility) {
        torus.hideTorusButton();
      } else {
        torus?.showTorusButton();
      }
    },
    console(...args: any[]): void {
      const el = document.querySelector("#console>p");
      if (el) {
        el.innerHTML = JSON.stringify(args || {}, null, 2);
      }
    },
    createPaymentTx() {
      const { torus } = web3Obj;
      torus
        ?.initiateTopup("mercuryo", {
          selectedCurrency: "USD",
        })
        .then(console.log)
        .catch(console.error);
    },
    sendEth() {
      const { web3 } = web3Obj;
      web3.eth
        .sendTransaction({ from: this.publicAddress, to: this.publicAddress, value: web3.utils.toWei("0.01") })
        .then((resp) => this.console(resp))
        .catch(console.error);
      // window.web3.eth
      //   .sendTransaction({ from: this.publicAddress, to: this.publicAddress, value: window.web3.utils.toWei('0.02') })
      //   .then((resp) => this.console(resp))
      //   .catch(console.error)
      // window.web3.eth
      //   .sendTransaction({ from: this.publicAddress, to: this.publicAddress, value: window.web3.utils.toWei('0.03') })
      //   .then((resp) => this.console(resp))
      //   .catch(console.error)
      // window.web3.eth
      //   .sendTransaction({ from: this.publicAddress, to: this.publicAddress, value: window.web3.utils.toWei('0.04') })
      //   .then((resp) => this.console(resp))
      //   .catch(console.error)
    },
    signMessageWithoutPopup() {
      const { web3 } = web3Obj;
      const self = this;
      // hex message
      const message = "Hello world";
      const customPrefix = `\u0019${window.location.hostname} Signed Message:\n`;
      const prefixWithLength = Buffer.from(`${customPrefix}${message.length.toString()}`, "utf-8");
      const hashedMsg = keccak256(Buffer.concat([prefixWithLength, Buffer.from(message)]));
      (web3.currentProvider as any)?.send(
        {
          method: "eth_sign",
          params: [this.publicAddress, hashedMsg, { customPrefix, customMessage: message }],
          from: this.publicAddress,
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          const signerAddress = ethers.utils.recoverAddress(hashedMsg, result.result);
          return self.console(
            "sign message => true",
            `message: ${prefixWithLength + message}`,
            `msgHash: ${hashedMsg}`,
            `sig: ${result.result}`,
            `signer: ${signerAddress}`
          );
        }
      );
    },
    signMessage() {
      const { web3 } = web3Obj;
      const self = this;
      // hex message
      const message = "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";
      (web3.currentProvider as any)?.send(
        {
          method: "eth_sign",
          params: [this.publicAddress, message],
          from: this.publicAddress,
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          return self.console("sign message => true", result);
        }
      );
    },
    signTypedData_v1() {
      const { web3 } = web3Obj;
      const typedData = [
        {
          type: "string",
          name: "message",
          value: "Hi, Alice!",
        },
        {
          type: "uint8",
          name: "value",
          value: 10,
        },
      ];
      const self = this;
      (web3.currentProvider as any)?.send(
        {
          method: "eth_signTypedData",
          params: [typedData, this.publicAddress],
          from: this.publicAddress,
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }

          const recovered = recoverTypedMessage(
            {
              data: typedData,
              sig: result.result,
            },
            "V1"
          );

          if (recovered.toLowerCase() === this.publicAddress.toLowerCase()) {
            return self.console(`sign typed message v1 => true`, result, `Recovered signer: ${this.publicAddress}`);
          }
          return self.console(`Failed to verify signer, got: ${recovered}`);
        }
      );
    },

    signTypedData_v3() {
      const { web3 } = web3Obj;
      const typedData = getV3TypedData(this.chainId.toString());
      const self = this;
      (web3.currentProvider as any)?.send(
        {
          method: "eth_signTypedData_v3",
          params: [this.publicAddress, JSON.stringify(typedData)],
          from: this.publicAddress,
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          const recovered = recoverTypedMessage(
            {
              data: typedData as any,
              sig: result.result,
            },
            "V3"
          );

          if (recovered.toLowerCase() === this.publicAddress.toLowerCase()) {
            return self.console(`sign typed message v3 => true`, result, `Recovered signer: ${this.publicAddress}`);
          }
          return self.console(`Failed to verify signer, got: ${recovered}`);
        }
      );
    },
    signTypedData_v4() {
      const { web3 } = web3Obj;
      const typedData = getV4TypedData(this.chainId.toString());
      const self = this;
      (web3.currentProvider as any)?.send(
        {
          method: "eth_signTypedData_v4",
          params: [this.publicAddress, JSON.stringify(typedData)],
          from: this.publicAddress,
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          const recovered = recoverTypedMessage(
            {
              data: typedData as any,
              sig: result.result,
            },
            "V4"
          );

          if (recovered.toLowerCase() === this.publicAddress.toLowerCase()) {
            return self.console(`sign typed message v4 => true`, result, `Recovered signer: ${this.publicAddress}`);
          }
          return self.console(`Failed to verify signer, got: ${recovered}`);
        }
      );
    },
    async signPersonalMsg() {
      try {
        const { web3 } = web3Obj;
        const message = "Some string";
        const hash = web3.utils.sha3(message) as string;
        const sig = await web3.eth.personal.sign(hash, this.publicAddress, "");
        const hostnamealAddress = await web3.eth.personal.ecRecover(hash, sig);
        if (this.publicAddress.toLowerCase() === hostnamealAddress.toLowerCase()) this.console("Success");
        else this.console("Failed");
      } catch (error) {
        console.error(error);
        this.console("failed");
      }
    },
    logout() {
      const { torus } = web3Obj;
      torus
        ?.cleanUp()
        .then(() => {
          this.publicAddress = "";
          return undefined;
        })
        .catch(console.error);
    },
    changeProvider() {
      const { torus } = web3Obj;
      torus?.setProvider({ host: "bsc_testnet" }).then(this.console).catch(this.console);
    },
    async sendDai() {
      try {
        const { torus, web3 } = web3Obj;
        if (this.chainId !== 1) {
          await torus?.setProvider({ host: "mainnet" });
        }
        const instance = new web3.eth.Contract(tokenAbi, "0x6b175474e89094c44da98b954eedeac495271d0f");
        const balance = await instance.methods.balanceOf(this.publicAddress).call();
        console.log(balance, "dai balance");
        const value = Math.floor(parseFloat("0.01") * 10 ** parseFloat("18")).toString();
        if (Number(balance) < Number(value)) {
          // eslint-disable-next-line no-alert
          window.alert("You do not have enough dai tokens for transfer");
          return;
        }
        instance.methods.transfer(this.publicAddress, value).send(
          {
            from: this.publicAddress,
          },
          (err: Error, hash: string) => {
            if (err) this.console(err);
            else this.console(hash);
          }
        );
      } catch (error) {
        console.error(error);
      }
    },
    async approveKnc() {
      try {
        const { torus, web3 } = web3Obj;
        console.log(this.chainId, "current chain id");
        if (this.chainId !== 1) {
          await torus?.setProvider({ host: "mainnet" });
        }
        const instance = new web3.eth.Contract(tokenAbi, "0xdd974D5C2e2928deA5F71b9825b8b646686BD200");
        let value = Math.floor(parseFloat("0.01") * 10 ** parseFloat("18")).toString();
        const allowance = await instance.methods.allowance(this.publicAddress, "0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3").call();
        console.log(allowance, "current allowance");
        if (Number(allowance) > 0) value = "0";
        instance.methods.approve("0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3", value).send(
          {
            from: this.publicAddress,
          },
          (err: Error, hash: string) => {
            if (err) this.console(err);
            else this.console(hash);
          }
        );
      } catch (error) {
        console.error(error);
      }
    },
    async getUserInfo() {
      const { torus } = web3Obj;
      torus?.getUserInfo("").then(this.console).catch(this.console);
    },
    getPublicAddress() {
      const { torus } = web3Obj;
      console.log(this.selectedVerifier, this.verifierId);
      torus
        ?.getPublicAddress({ verifier: this.selectedVerifier, verifierId: this.verifierId } as VerifierArgs)
        .then(this.console)
        .catch(console.error);
    },
    getEncryptionKey() {
      const { web3 } = web3Obj;
      const self = this;
      (web3.currentProvider as any)?.send(
        {
          method: "eth_getEncryptionPublicKey",
          params: [this.publicAddress],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          self.encryptionKey = result.result;
          return self.console(`encryption public key => ${result.result}`);
        }
      );
    },
    encryptMessage() {
      try {
        const messageEncrypted = encrypt(this.encryptionKey, { data: this.messageToEncrypt }, "x25519-xsalsa20-poly1305");
        this.messageEncrypted = this.stringifiableToHex(messageEncrypted);
        this.console(`encrypted message => ${this.messageEncrypted}`);
      } catch (error) {}
    },
    decryptMessage() {
      const { web3 } = web3Obj;
      const self = this;
      (web3.currentProvider as any)?.send(
        {
          method: "eth_decrypt",
          params: [this.messageEncrypted, this.publicAddress],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          return self.console(`decrypted message => ${result.result}`);
        }
      );
    },
    stringifiableToHex(value: any): string {
      return ethers.utils.hexlify(Buffer.from(JSON.stringify(value)));
    },
  },
});
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
#console {
  border: 0px solid black;
  height: 40px;
  padding: 2px;
  text-align: left;
  width: calc(100% - 20px);
  border-radius: 5px;
  margin-top: 20px;
  margin-bottom: 80px;
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
