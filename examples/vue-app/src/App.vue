<template>
  <div v-if="!publicAddress" class="login-container h-screen">
    <h3 class="login-heading">Login With Torus</h3>
    <p class="login-subheading">
      Build Environment :
      <span class="uppercase">{{ buildEnv }}</span>
    </p>
    <div class="align-left md-bottom-gutter">
      <label class="btn-label">Select build environment</label>
      <select v-model="buildEnv" name="buildEnv" class="login-input select-input bg-dropdown">
        <option value="production">Production</option>
        <option value="binance">Binance</option>
        <option selected value="testing">Testing</option>
        <option value="development">Development</option>
        <option value="lrc">LRC</option>
        <option value="beta">Beta</option>
      </select>
    </div>
    <button class="custom-btn cursor-pointer block md-bottom-gutter" @click="login(true)">Login</button>
    <button class="custom-btn cursor-pointer block md-bottom-gutter" @click="login(false)">Login without whitelabel</button>
    <h6 class="or">or</h6>
    <div class="flex-col block">
      <input
        v-model="privateKey"
        class="login-input select-input md-bottom-gutter"
        style="width: 100% !important"
        :placeholder="`Enter private key to login`"
      />
      <button class="custom-btn cursor-pointer block" @click="loginWithPrivateKey">Login With Private Key</button>
    </div>
  </div>
  <div v-else class="dashboard-container p-0">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="max-md:flex max-md:items-center max-md:justify-between max-md:w-full">
        <h1 class="dashboard-heading">demo-eth.tor.us</h1>
        <p class="dashboard-subheading !font-bold sm:!font-normal">
          Build environment :
          <span class="uppercase">{{ buildEnv }}</span>
        </p>
      </div>
      <div class="dashboard-action-container flex items-end justify-end">
        <button :class="['dashboard-action-address', { '!text-green-500': isCopied }]" :title="publicAddress" @click.stop="copyAccountAddress">
          <img :src="require('./assets/copy.svg')" alt="logout" height="14" width="14" />
          {{ isCopied ? "Copied" : getAddress() }}
        </button>
        <div class="dashboard-action-badge">
          <img :src="require('./assets/wifi.svg')" alt="logout" height="14" width="14" />
          {{ chainIdNetworkMap[chainId] }}
        </div>
        <button class="dashboard-action-logout" @click.stop="logout">
          <img :src="require('./assets/logout.svg')" alt="logout" height="20" width="20" />
          <span class="hidden sm:block">Logout</span>
        </button>
      </div>
    </div>
    <!-- Dashboard Action Container -->
    <div class="dashboard-details-container">
      <div class="dashboard-details-btn-container">
        <h1 class="details-heading px-6 pt-6 flex justify-between items-center">
          <span>Torus Specific Info</span>
          <span><img alt="down" class="cursor-pointer" src="./assets/down.svg" @click="isExpanded = !isExpanded" /></span>
        </h1>
        <div :class="['px-6', { 'pb-6': !isExpanded }]">
          <label for="default-toggle" class="inline-flex relative items-center cursor-pointer">
            <input type="checkbox" id="default-toggle" class="sr-only peer" checked @click="toggleButton" />
            <div
              class="w-11 h-6 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
            ></div>
            <span class="ml-3 text-sm font-normal text-gray-400">Show Torus Button</span>
          </label>
        </div>
        <div v-show="isExpanded" class="details-container">
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <div class="btn-block">
              <p class="btn-label">Wallet connect</p>
              <button class="custom-btn cursor-pointer" @click="showWalletConnect">Show wallet connect</button>
            </div>
            <div class="btn-block">
              <p class="btn-label">Payment Transaction</p>
              <button class="custom-btn cursor-pointer" @click="createPaymentTx">Create</button>
            </div>
          </div>
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <div class="btn-block">
              <p class="btn-label">User info</p>
              <button class="custom-btn cursor-pointer" @click="getUserInfo">Get User Info</button>
            </div>
            <div class="btn-block">
              <p class="btn-label">Balance</p>
              <button class="custom-btn cursor-pointer" @click="getBalance">Get Balance</button>
            </div>
          </div>
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <div class="btn-block">
              <p class="btn-label">Add Provider</p>
              <button class="custom-btn cursor-pointer" @click="addChain">Add Chain with provider</button>
            </div>
            <div class="btn-block">
              <p class="btn-label">Switch Provider</p>
              <button class="custom-btn cursor-pointer" @click="switchChain">Switch Chain with provider</button>
            </div>
          </div>
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <div class="btn-block">
              <p class="btn-label">Provider</p>
              <button class="custom-btn cursor-pointer" @click="changeProvider">Change Provider</button>
            </div>
          </div>
          <p class="btn-label">Public address</p>
          <div class="flex items-center justify-start gap-4 mb-4">
            <div
              v-for="item in publicAddressList"
              :key="item"
              :class="['p-2 rounded-full items-center justify-center border shadow-lg', { 'border-blue-600': selectedVerifier === item }]"
              @click="onSelectedVerifierChanged(item)"
            >
              <img
                v-if="item !== 'email_passwordless'"
                class="cursor-pointer items-center justify-center flex self-center"
                :src="`https://images.web3auth.io/login-${item}-active.svg`"
                :alt="`${item} Icon`"
              />
              <img v-else :src="require('./assets/mail.svg')" alt="Email Passwordless" width="30" height="30" />
            </div>
          </div>
          <div class="flex flex-col sm:!flex-row gap-2 items-center bottom-gutter w-full">
            <input v-model="verifierId" :placeholder="placeholder" class="login-input select-input !w-full sm:!w-[272px]" />
            <button
              class="custom-btn cursor-pointer disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed w-full"
              :disabled="verifierId === ''"
              @click="getPublicAddress"
            >
              Get Public Address
            </button>
          </div>
          <h1 class="details-heading">Blockchain APIs</h1>
          <p class="btn-label">Signing</p>
          <div class="flex-row bottom-gutter">
            <button class="custom-btn cursor-pointer" @click="signMessageWithoutPopup">ETH without popup</button>
          </div>
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <button class="custom-btn cursor-pointer w-full" @click="signPersonalMsg">Personal Sign</button>
            <button class="custom-btn cursor-pointer w-full" @click="signMessage">ETH Sign</button>
          </div>
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <button class="custom-btn cursor-pointer w-full" @click="signTypedData_v1">Typed data v1</button>
            <button class="custom-btn cursor-pointer w-full" @click="signTypedData_v3">Typed data v3</button>
            <button class="custom-btn cursor-pointer w-full" @click="signTypedData_v4">Typed data v4</button>
          </div>
          <p class="btn-label">Transactions</p>
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <button class="custom-btn cursor-pointer w-full" @click="sendEth">Send ETH</button>
            <button class="custom-btn cursor-pointer w-full" @click="sendDai">Send DAI</button>
            <button class="custom-btn cursor-pointer w-full" @click="approveKnc">Approve KNC</button>
          </div>
          <p class="btn-label">Encrypt / Decrypt</p>
          <div class="flex-row bottom-gutter">
            <button class="custom-btn cursor-pointer" @click="getEncryptionKey">Get Encryption Key</button>
          </div>
          <div class="bottom-gutter">
            <textarea
              class="login-input select-input md-bottom-gutter !w-full"
              v-model="messageToEncrypt"
              placeholder="Message to encrypt"
              rows="6"
            />
            <div class="flex-row bottom-gutter">
              <button
                class="custom-btn cursor-pointer disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                :disabled="!encryptionKey"
                @click="encryptMessage"
              >
                Encrypt
              </button>
              <button
                class="custom-btn cursor-pointer disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                :disabled="!messageEncrypted"
                @click="decryptMessage"
              >
                Decrypt
              </button>
            </div>
          </div>
          <p class="btn-label">Add Asset</p>
          <div class="flex gap-4 flex-col sm:!flex-row bottom-gutter">
            <button class="custom-btn cursor-pointer w-full" @click="addErc20Token">Add Erc20 Token</button>
            <button class="custom-btn cursor-pointer w-full" @click="addCollectible">Add NFT</button>
          </div>
        </div>
      </div>
      <!-- Dashboard Console Container -->
      <div id="console" class="dashboard-details-console-container">
        <pre ref="consoleDiv" class="console-container"></pre>
        <div class="clear-console-btn">
          <button class="custom-btn cursor-pointer console-btn" @click="clearConsole">Clear console</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Torus, { TORUS_BUILD_ENV_TYPE, VerifierArgs } from "@toruslabs/torus-embed";
import { SignTypedDataVersion, encrypt, recoverPersonalSignature, recoverTypedSignature } from "@metamask/eth-sig-util";
import { defineComponent } from "vue";

import { getV3TypedData, getV4TypedData, loginConfig, whiteLabelData } from "./data";
import web3Obj from "./helpers";
import tokenAbi from "human-standard-token-abi";

export default defineComponent({
  name: "App",
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
      buildEnv: "lrc" as TORUS_BUILD_ENV_TYPE,
      publicAddressList: ["google", "discord", "reddit", "email_passwordless"],
      isExpanded: true,
      isCopied: false,
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
    onSelectedVerifierChanged(verifier: string) {
      this.selectedVerifier = verifier;
      switch (this.selectedVerifier) {
        case "google":
          this.placeholder = "Enter Google Email";
          break;
        case "reddit":
          this.placeholder = "Enter Reddit Username";
          break;
        case "discord":
          this.placeholder = "Enter Discord ID";
          break;
        default:
          this.placeholder = "Enter Email ID";
          break;
      }
      this.verifierId = "";
    },
    async loginWithPrivateKey() {
      try {
        const { torus, web3 } = web3Obj;
        (window as any).torus = torus;
        await torus?.init({
          useWalletConnect: true,
          buildEnv: this.buildEnv,
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
    async login(useWhitelabel: boolean) {
      try {
        const { torus, web3 } = web3Obj;
        (window as any).torus = torus;
        await torus?.init({
          buildEnv: this.buildEnv,
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
          mfaLevel: "optional",
          useWalletConnect: true,
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
      const el = document.querySelector("#console>pre");
      const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
      if (el) {
        el.innerHTML = JSON.stringify(args || {}, null, 2);
      }
      if (consoleBtn) {
        consoleBtn.style.display = "block";
      }
    },
    clearConsole() {
      const el = document.querySelector("#console>pre");
      const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
      if (el) {
        el.innerHTML = "";
      }
      if (consoleBtn) {
        consoleBtn.style.display = "none";
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
        .sendTransaction({ from: this.publicAddress, to: this.publicAddress, value: web3.utils.toWei("0.01", "ether") })
        .then((resp) => this.console(resp))
        .catch(console.error);
    },
    signMessageWithoutPopup() {
      const { torus } = web3Obj;
      const self = this;
      // hex message
      const message = "Hello world";
      const customPrefix = `\u0019${window.location.hostname} Signed Message:\n`;
      const prefixWithLength = Buffer.from(`${customPrefix}${message.length.toString()}`, "utf-8");
      const hashedMsg = web3Obj.web3.utils.keccak256(Buffer.concat([prefixWithLength, Buffer.from(message)]).toString());
      torus.provider?.sendAsync(
        {
          method: "eth_sign",
          params: [this.publicAddress, hashedMsg, { customPrefix, customMessage: message }],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          const signerAddress = recoverPersonalSignature({ data: hashedMsg, signature: result.result });
          return self.console(
            "sign message => true",
            `message: ${prefixWithLength + message}`,
            `msgHash: ${hashedMsg}`,
            `sig: ${result.result}`,
            `signer: ${signerAddress}`,
          );
        },
      );
    },
    signMessage() {
      const { torus } = web3Obj;
      const self = this;
      // hex message
      const message = "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";
      torus.provider.sendAsync(
        {
          method: "eth_sign",
          params: [this.publicAddress, message],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          return self.console("sign message => true", result);
        },
      );
    },
    signTypedData_v1() {
      const { torus } = web3Obj;
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
      torus.provider.sendAsync(
        {
          method: "eth_signTypedData",
          params: [typedData, this.publicAddress],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }

          const recovered = recoverTypedSignature({
            data: typedData,
            signature: result.result,
            version: SignTypedDataVersion.V1,
          });

          if (recovered.toLowerCase() === this.publicAddress.toLowerCase()) {
            return self.console(`sign typed message v1 => true`, result, `Recovered signer: ${this.publicAddress}`);
          }
          return self.console(`Failed to verify signer, got: ${recovered}`);
        },
      );
    },

    signTypedData_v3() {
      const { torus } = web3Obj;
      const typedData = getV3TypedData(this.chainId.toString());
      const self = this;
      torus.provider.sendAsync(
        {
          method: "eth_signTypedData_v3",
          params: [this.publicAddress, JSON.stringify(typedData)],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          const recovered = recoverTypedSignature({
            data: typedData as any,
            signature: result.result,
            version: SignTypedDataVersion.V3,
          });

          if (recovered.toLowerCase() === this.publicAddress.toLowerCase()) {
            return self.console(`sign typed message v3 => true`, result, `Recovered signer: ${this.publicAddress}`);
          }
          return self.console(`Failed to verify signer, got: ${recovered}`);
        },
      );
    },
    signTypedData_v4() {
      const { torus } = web3Obj;
      const typedData = getV4TypedData(this.chainId.toString());
      const self = this;
      torus.provider.sendAsync(
        {
          method: "eth_signTypedData_v4",
          params: [this.publicAddress, JSON.stringify(typedData)],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          const recovered = recoverTypedSignature({
            data: typedData as any,
            signature: result.result,
            version: SignTypedDataVersion.V4,
          });

          if (recovered.toLowerCase() === this.publicAddress.toLowerCase()) {
            return self.console(`sign typed message v4 => true`, result, `Recovered signer: ${this.publicAddress}`);
          }
          return self.console(`Failed to verify signer, got: ${recovered}`);
        },
      );
    },
    async signPersonalMsg() {
      try {
        const { web3 } = web3Obj;
        const message = "Some string";
        const hash = web3.utils.sha3(message);
        const sig = await web3.eth.personal.sign(hash, this.publicAddress, "");
        const hostnameAddress = await web3.eth.personal.ecRecover(hash, sig);
        if (this.publicAddress.toLowerCase() === hostnameAddress.toLowerCase()) this.console("Success");
        else this.console("Failed");
      } catch (error) {
        console.error(error);
        this.console("failed");
      }
    },
    async addErc20Token() {
      const { torus } = web3Obj;
      try {
        const res = await torus.provider?.request({
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
      const { torus } = web3Obj;
      try {
        const res = await torus.provider?.request({
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

    addChain() {
      const { torus } = web3Obj;
      const self = this;
      torus.provider?.sendAsync(
        {
          method: "wallet_addEthereumChain",
          params: {
            chainId: "0x2",
            chainName: "Ethereum",
            nativeCurrency: {
              name: "ether",
              symbol: "ETH", // 2-6 characters long
              decimals: 18,
            },
            rpcUrls: ["https://rpc.ankr.com/eth"],
          },
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          self.encryptionKey = result.result;
          return self.console(`add chain result => ${result.result}`);
        },
      );
    },
    switchChain() {
      const { torus } = web3Obj;
      const self = this;
      torus.provider.sendAsync(
        {
          method: "wallet_switchEthereumChain",
          params: {
            chainId: "0x5",
          },
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          self.encryptionKey = result.result;
          return self.console(`switch chain result => ${result.result}`);
        },
      );
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
          },
        );
      } catch (error) {
        console.error(error);
        this.console(error);
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
          },
        );
      } catch (error) {
        console.error(error);
        this.console(error);
      }
    },
    async getUserInfo() {
      const { torus } = web3Obj;
      torus?.getUserInfo("").then(this.console).catch(this.console);
      this.getScroll();
    },
    async getBalance() {
      try {
        const { web3 } = web3Obj;
        const bal = await web3.eth.getBalance(this.publicAddress);
        this.console(`balance: ${web3.utils.fromWei(bal, "ether")} ETH`);
      } catch (error) {
        console.error(error);
        this.console(error);
      }
    },
    getPublicAddress() {
      const { torus } = web3Obj;
      console.log(this.selectedVerifier, this.verifierId);
      torus
        ?.getPublicAddress({ verifier: this.selectedVerifier, verifierId: this.verifierId } as VerifierArgs)
        .then(this.console)
        .catch(console.error);
      this.getScroll();
    },
    getEncryptionKey() {
      const { torus } = web3Obj;
      const self = this;
      torus.provider.sendAsync(
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
        },
      );
      this.getScroll();
    },
    encryptMessage() {
      try {
        const messageEncrypted = encrypt({ publicKey: this.encryptionKey, data: this.messageToEncrypt, version: "x25519-xsalsa20-poly1305" });
        this.messageEncrypted = Buffer.from(JSON.stringify(messageEncrypted)).toString("hex");
        this.console(`encrypted message => ${this.messageEncrypted}`);
        this.getScroll();
      } catch (error) {}
    },
    decryptMessage() {
      const { torus } = web3Obj;
      const self = this;
      torus.provider.sendAsync(
        {
          method: "eth_decrypt",
          params: [this.messageEncrypted, this.publicAddress],
        },
        (err: Error, result: any) => {
          if (err) {
            return console.error(err);
          }
          return self.console(`decrypted message => ${result.result}`);
        },
      );
      this.getScroll();
    },
    copyAccountAddress() {
      this.isCopied = true;
      navigator.clipboard.writeText(this.publicAddress);
      setTimeout(() => {
        this.isCopied = false;
      }, 1000);
    },
    getAddress() {
      if (this.publicAddress.length < 11) {
        return this.publicAddress;
      }
      if (typeof this.publicAddress !== "string") return "";
      return `${this.publicAddress.slice(0, 5)}...${this.publicAddress.slice(-5)}`;
    },
    async toggleButton() {
      const { torus } = web3Obj;
      const toggleChecked = (document.getElementById("default-toggle") as HTMLInputElement)?.checked;
      if (!toggleChecked) {
        torus?.hideTorusButton();
        // showButton.value = false;
      } else {
        torus?.showTorusButton();
        // showButton.value = true;
      }
      // debugConsole(toggleChecked ? "show button" : "hide button");
    },
    getScroll() {
      var console = document.getElementById("console");

      console.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    },
  },
});
</script>

<style scoped>
@import "./App.css";
</style>
