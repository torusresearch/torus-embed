<template>
  <div id="app">
    <div class="grid text-center justify-center pt-20 flex justify-center items-center" v-if="publicAddress === ''">
      <h6 class="font-bold text-3xl">Login With Torus</h6>
      <h6 class="font-semibold text-[#595857]">Build Environment : {{ buildEnv }}</h6>
      <div class="pb-2">
        <h3 class="font-semibold text-[#595857]">Select build environment</h3>
        <select name="buildEnv" v-model="buildEnv" class="select-menu bg-dropdown">
          <option value="production">Production</option>
          <option value="binance">Binance</option>
          <option selected value="testing">Testing</option>
          <option value="development">Development</option>
          <option value="lrc">LRC</option>
          <option value="beta">Beta</option>
        </select>
      </div>
      <div>
        <!-- <button @click="login" class="btn-login">Login</button> -->
        <button @click="login(true)" class="btn-login m-2">Login</button>
        <button @click="login(false)" class="btn-login">Login without whitelabel</button>
      </div>
      <h6 class="py-4 text-[#595857]">or</h6>
      <div class="pb-2">
        <h3 class="font-semibold text-[#595857]">Private Key</h3>
        <!-- <input :style="{ marginLeft: '20px' }" v-model="privateKey" :placeholder="`Enter private key to login`" /> -->
        <input placeholder="Enter private key to login" v-model="privateKey" class="btn-login px-4 py-2" />
      </div>
      <div>
        <!-- <button @click="loginWithPrivateKey">Login With Private Key</button> -->
        <button @click="loginWithPrivateKey" class="btn-login">Login with Private Key</button>
      </div>
    </div>
    <!-- <h3>Login With Torus</h3>
      <p>
        Build Environment :
        <i>{{ buildEnv }}</i>
      </p> -->
    <!-- <div v-if="publicAddress === ''">
        <div style="display: flex; justify-content: center; flex-direction: column; align-items: center">
          <div>
            <select name="buildEnv" v-model="buildEnv">
              <option value="production">Production</option>
              <option value="binance">Binance</option>
              <option selected value="testing">Testing</option>
              <option value="development">Development</option>
              <option value="lrc">LRC</option>
              <option value="beta">Beta</option>
            </select>
            <button @click="login(true)">Login</button>
            <button @click="login(false)">Login without whitelabel</button>
          </div>
          <span>OR</span>
          <div>
            <input :style="{ marginLeft: '20px' }" v-model="privateKey" :placeholder="`Enter private key to login`" />
            <button @click="loginWithPrivateKey">Login With Private Key</button>
          </div>
        </div>
      </div>
      <button v-else @click="logout">Logout</button> -->
    <!-- </section> -->
    <div v-else>
      <div class="flex box md:rows-span-2 m-6 items-center py-4">
        <div class="ml-6">
          <h6 class="text-2xl font-semibold text-left">demo-eth.tor.us</h6>
          <h6 class="text-left">Build environment : {{ buildEnv }}</h6>
        </div>
        <div class="ml-auto">
          <button
            type="button"
            class="copy-btn"
            @click="
              () => {
                copyToClip(publicAddress);
              }
            "
          >
            <img class="pr-1" src="./assets/copy.svg" />
            <span>{{ copied ? "Copied!" : getAddress(publicAddress) }}</span>
          </button>
          <button type="button" class="wifi-btn">
            <img src="./assets/wifi.svg" />
            <div class="font-semibold pl-1">{{ getNetworkType(chainIdNetworkMap[chainId]) }}</div>
          </button>
          <button type="button" @click="logout" class="btn-logout">
            <img src="./assets/logout.svg" class="pr-3 pl-0" />
            Logout
          </button>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-7 m-6 height-fit overflow-auto">
        <div class="grid grid-cols-2 col-span-5 md:col-span-2 text-left gap-2 p-4 box md:pb-74">
          <div class="col-span-2">
            <h6 class="text-xl font-semibold">Torus Specific Info</h6>
            <div>
              <label for="default-toggle" class="inline-flex relative items-center cursor-pointer">
                <input type="checkbox" id="default-toggle" class="sr-only peer" @click="toggleTorusWidget" checked />
                <div
                  class="w-11 h-6 rounded-full peer bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                ></div>
                <span class="ml-3 text-sm font-medium">Show Torus Button</span>
              </label>
            </div>
          </div>
          <div class="col-span-1 pt-2">
            <div class="font-semibold">Wallet connect</div>
            <div><button class="btn" @click="showWalletConnect">Show wallet connect</button></div>
          </div>
          <div class="col-span-1 pt-2">
            <div class="font-semibold">Payment Transaction</div>
            <div><button class="btn" @click="createPaymentTx">Create</button></div>
          </div>
          <div class="col-span-1 pt-2">
            <div class="font-semibold">User Info</div>
            <div><button class="btn" @click="getUserInfo">Get User Info</button></div>
          </div>
          <div class="col-span-1 pt-2">
            <div class="font-semibold">Provider</div>
            <div><button class="btn" @click="changeProvider">Change Provider</button></div>
          </div>
          <div class="col-span-1 pt-2">
            <div class="font-semibold">Public address</div>
            <select name="verifier" :value="selectedVerifier" @change="onSelectedVerifierChanged" class="select-menu-public bg-dropdown">
              <option selected value="google">Google</option>
              <option value="reddit">Reddit</option>
              <option value="discord">Discord</option>
              <option value="torus-auth0-email-passwordless">Email Passwordless</option>
            </select>
          </div>
          <div class="col-span-1"></div>
          <div class="col-span-1">
            <input v-model="verifierId" :placeholder="placeholder" class="btn p-2" />
          </div>
          <div class="col-span-1">
            <button :disabled="!verifierId" class="btn" @click="getPublicAddress">Get Public Address</button>
          </div>
          <div class="col-span-2 pt-2">
            <h6 class="text-xl font-semibold">Blockchain APIs</h6>
          </div>
          <div class="col-span-2 text-left pt-2">
            <div class="font-semibold">Signing</div>
            <div class="grid grid-cols-3 gap-4">
              <button class="btn" @click="signMessageWithoutPopup">ETH without popup</button>
              <button class="btn" @click="signPersonalMsg">Personal Sign</button>
              <button class="btn" @click="signMessage">ETH Sign</button>
              <button class="btn" @click="signTypedData_v1">Typed data v1</button>
              <button class="btn" @click="signTypedData_v3">Typed data v2</button>
              <button class="btn" @click="signTypedData_v4">Typed data v3</button>
            </div>
          </div>
          <div class="col-span-2 text-left pt-2">
            <div class="font-semibold">Transactions</div>
            <div class="grid grid-cols-3 gap-4">
              <button class="btn" @click="sendEth">Send ETH</button>
              <button class="btn" @click="sendDai">Send DAI</button>
              <button class="btn" @click="approveKnc">approve Knc</button>
            </div>
          </div>
          <div class="col-span-2 text-left">
            <div class="font-semibold">Encrypt / Decrypt</div>
            <div class="grid grid-cols-2 gap-4">
              <button class="btn" @click="getEncryptionKey">Get Encryption Key</button>
            </div>
          </div>
          <div class="col-span-2 text-left">
            <textarea v-model="messageToEncrypt" placeholder="Message to encrypt" class="rounded-lg w-full p-2 bg-gray-100 min-h-[60px]"></textarea>
          </div>
          <div class="col-span-2 text-left">
            <div class="grid grid-cols-2 gap-4">
              <button class="btn" :disabled="!encryptionKey" @click="encryptMessage">Encrypt</button>
              <button class="btn" :disabled="!messageEncrypted" @click="decryptMessage">Decrypt</button>
            </div>
          </div>
          <div class="col-span-2 text-left pt-2">
            <div class="font-semibold">Add Assets</div>
            <div class="grid grid-cols-2 gap-4">
              <button class="btn" @click="addErc20Token">Add ERC20 Token</button>
              <button class="btn" @click="addCollectible">Add NFT</button>
              <!-- <button class="btn" @click="approveKnc">approve Knc</button> -->
            </div>
          </div>
        </div>
        <div class="box-grey" id="console">
          <p ref="consoleDiv" style="white-space: pre-line"></p>
          <button class="clear-button" @click="clearUiconsole">Clear console</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Torus, { TORUS_BUILD_ENV_TYPE, VerifierArgs } from "@toruslabs/torus-embed";
import { getV3TypedData, getV4TypedData, loginConfig, whiteLabelData } from "./data";
import { encrypt, recoverTypedMessage } from "eth-sig-util";
import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import web3Obj from "./helpers";
import tokenAbi from "human-standard-token-abi";
import copyToClipboard from "copy-to-clipboard";
export default Vue.extend({
  name: "app",
  data() {
    return {
      privateKey: "",
      publicAddress: "",
      chainId: 1,
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
      buildEnv: "development" as TORUS_BUILD_ENV_TYPE,
      copied: false as boolean,
      modelValue: true as boolean,
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
      this.selectedVerifier = (e.target as HTMLSelectElement).value;
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
    async loginWithPrivateKey() {
      try {
        const { torus, web3 } = web3Obj;
        (window as any).torus = torus;
        await torus?.init({
          // useWalletConnect: true,
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
        });

        await torus?.loginWithPrivateKey({
          privateKey: this.privateKey,
          userInfo: {
            email: "test@gmail.com",
            profileImage: "",
            name: "",
            typeOfLogin: "google",
            verifierId: "test@gmail.com",
            verifier: "google",
          },
        }); // await torus.ethereum.enable()
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
    async login(useWhitelabel) {
      try {
        const { torus, web3 } = web3Obj;
        (window as any).torus = torus;
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
          // integrity: {
          //   version: "1.11.0",
          //   check: true,
          // version: '1.4.2',
          // hash: 'sha384-jwXOV6VJu+PM89ksbCSZyQRjf5FdX8n39nWfE/iQBMh4r5m027ua2tkQ+83FPdp9'
          // },
          loginConfig: this.buildEnv === "lrc" || this.buildEnv === "development" ? loginConfig : undefined,
          whiteLabel: useWhitelabel ? whiteLabelData : undefined,
          skipTKey: true,
          mfaLevel: "optional",
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
    async showWalletConnect() {
      const { torus } = web3Obj;
      await torus.showWalletConnectScanner();
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
    async addErc20Token() {
      const { web3 } = web3Obj;
      try {
        const res = await (web3.currentProvider as any)?.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
              symbol: "USDT",
              decimals: 18,
              image: "https://foo.io/token-image.svg",
            },
          },
        });
        this.console("success", res);
      } catch (error) {
        console.error(error);
        this.console("failed");
      }
    },
    async addCollectible() {
      const { web3 } = web3Obj;
      try {
        const res = await (web3.currentProvider as any)?.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC721",
            options: {
              address: "0x282BDD42f4eb70e7A9D9F40c8fEA0825B7f68C5D",
              id: "4876",
              image: "https://img.seadn.io/files/6a942ce9e60b9b456167138fd24885f2.png?fit=max&w=600",
              name: "V1 PUNK #4876",
            },
          },
        });
        this.console("success", res);
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
        // @ts-ignore
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
        // @ts-ignore
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
    copyToClip(account: string) {
      this.copied = true;
      copyToClipboard(account);
      setTimeout(() => {
        this.copied = false;
      }, 500);
    },
    getNetworkType(network: string) {
      if (network === "devnet") return "Solana Mainnet";
      return network;
    },
    getAddress(address: string) {
      if (address.length < 11) {
        return address;
      }
      if (typeof address !== "string") return "";
      return `${address.slice(0, 5)}...${address.slice(-5)}`;
    },
    clearUiconsole() {
      this.$refs["consoleDiv"].innerHTML = "";
    },
  },
});
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  /* -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale; */
  text-align: center;
  color: #2c3e50;
  /* margin-top: 60px; */
}
#console {
  padding: 2px;
  text-align: left;
}
#console > p {
  margin: 0.5em;
}
/* button {
  height: 25px;
  margin: 5px;
  background: none;
  border-radius: 5px;
} */
.select-menu {
  @apply h-12 w-80 rounded-3xl text-center bg-white bg-no-repeat p-1;
  border: solid 1px;
  /* -webkit-appearance: none;
  -moz-appearance: none; */
  background-position: right;
}
.select-menu-public {
  @apply rounded-3xl text-center bg-white bg-no-repeat p-1;
  border: solid 1px;
  /* -webkit-appearance: none;
  -moz-appearance: none; */
  background-position: right;
}
.btn-login {
  @apply h-12 w-80 bg-white rounded-3xl;
  border: 1px solid #6f717a;
}
.box {
  @apply bg-white max-h-screen overflow-auto;
  border: 1px solid #f3f3f4;
  border-radius: 20px;
  box-shadow: 4px 4px 20px rgba(46, 91, 255, 0.1);
}
.copy-btn {
  @apply h-6 px-2 m-2 text-sm inline-flex items-center overflow-hidden rounded-3xl leading-4 font-bold;
  background-color: #e9e9ea;
  color: #7f8fa4;
}

.wifi-btn {
  @apply h-6 text-sm inline-flex items-center text-center p-2 rounded-3xl;
  background-color: #cde0ff;
}
.btn-login {
  @apply h-12 w-80 bg-white rounded-3xl;
  border: 1px solid #6f717a;
}
.btn-logout {
  @apply h-12 w-32 bg-white rounded-3xl pl-6 m-2 text-sm inline-flex items-center;
  border: 1px solid #f3f3f4;
}
.box-grey {
  @apply col-span-5 md:col-span-3 overflow-hidden rounded-3xl relative;
  border: 1px solid #f3f3f4;
  box-shadow: 4px 4px 20px rgba(46, 91, 255, 0.1);
  min-height: 400px;
  background-color: #f3f3f4;
}
.btn {
  @apply w-full m-0 bg-white rounded-3xl text-sm lg:text-base font-medium;
  border: 1px solid #6f717a;
  min-height: 44px;
}
.clear-button {
  @apply fixed md:absolute right-2 bottom-2 w-28 h-7 rounded-md bg-[#f3f3f4];
  border: 1px solid #0f1222;
}
.btn:disabled {
  @apply bg-gray-100 opacity-30;
}
.height-fit {
  @layer max-h-fit relative;
  height: 80vh;
}
</style>
