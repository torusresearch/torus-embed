<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { MAINNET_CHAIN_ID, SUPPORTED_NETWORKS } from '@toruslabs/ethereum-controllers';
import Torus from '@toruslabs/torus-embed';
import { Loader } from "@toruslabs/vue-components/Loader";
import Button from "../Button";
import { PROVIDER_JRPC_METHODS } from '@toruslabs/base-controllers';

const WS_EMBED_BUILD_ENV = {
  production: "production",
  staging: "staging",
  development: "development",
  testing: "testing",
}

let torus = undefined;

const supportedNetworks = SUPPORTED_NETWORKS

const isLoading = ref(false);
const account = ref("");
const chainId = ref(MAINNET_CHAIN_ID);
const currentNetwork = ref(supportedNetworks[chainId.value].displayName);
const selectedBuildEnv = ref('production');
const preferredChainConfig = ref(null);
const sessionId = ref("");

const isCopied = ref(false);

const formattedAccountAddress = computed(() => {
  return `${account.value.substring(0, 5)}...${account.value.substring(account.value.length - 6)}`;
});

onBeforeMount(async () => {
  try {
    isLoading.value = true;
    torus = new Torus();

    const wsEmbedBuildEnv = sessionStorage.getItem("ws_embed_build_env");
    if (wsEmbedBuildEnv) {
      selectedBuildEnv.value = wsEmbedBuildEnv;
      await initializeTorus();
    }
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const initializeTorus = async () => {
  if (torus?.isInitialized) {
    if (selectedBuildEnv.value !== torus.getBuildEnv) await torus?.cleanUp();
    else return;
  }

  await torus?.init({
    buildEnv: selectedBuildEnv.value,
  });

  // Update provider on accountsChanged
  torus?.provider.on("accountsChanged", async (accounts) => {
    console.log("check: accountsChanged", accounts);
    if (account.value.length > 0 && accounts.length === 0) {
      account.value = "";
      isLoading.value = false;
      return;
    }
    if (accounts.length > 0) {
      login();
    }
  });
};

const login = async () => {
  try {
    isLoading.value = true;
    await initializeTorus();
    // Note: can pass authConnection and login_hint as params if you want to preselect a provider and login identifier eg. email
    // const loginaccs = await torus?.login({ authConnection: "google", login_hint: "sample@gmail.com" });

    // Passing empty will trigger showing the login modal showing all login provider options
    const loginaccs = await torus?.login();
    console.log("loginaccs", loginaccs);
    account.value = (loginaccs || [])[0] || "";
    isLoading.value = false;

    getCurrentChain();

    sessionStorage.setItem("ws_embed_build_env", selectedBuildEnv.value);
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};

const loginWithSessionId = async () => {
  try {
    isLoading.value = true;

    await initializeTorus();

    // namespace is hostname of current origin
    const result = await torus?.loginWithSessionId({ sessionId: sessionId.value, sessionNamespace: window.location.hostname });
    isLoading.value = false;
    if (result) {
      const loginaccs = await torus?.login();
      console.log("accounts", loginaccs);
      account.value = loginaccs?.[0] || "";
    }

    getCurrentChain();
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};

const logout = async () => {
  try {
    isLoading.value = true;
    await torus?.logout();
    account.value = "";
    sessionStorage.removeItem("ws_embed_build_env");
    // sessionStorage.removeItem("ws_embed_chain_namespace");
  } catch (error) {
    console.error(error);
    // uiConsole("Logout Error", error);
  } finally {
    isLoading.value = false;
  }
};

const getCurrentChain = async () => {
  // uiConsole("Getting current chain");
  const { chainId: currentChainId } = (await torus?.provider.request({
    method: PROVIDER_JRPC_METHODS.GET_PROVIDER_STATE,
    params: {},
  }));
  chainId.value = currentChainId;
  currentNetwork.value = supportedNetworks[currentChainId]?.displayName || `Chain Id: ${currentChainId}`;
  // uiConsole("Current Network", { chainId: currentChainId });
};

const getUserInfo = async () => {
  uiConsole("Getting user info");
  const userInfo = await torus?.getUserInfo();
  uiConsole("User Info", userInfo);
};

const showWalletConnect = async () => {
  await torus?.showWalletConnectScanner();
};

const showWalletUi = async () => {
  await torus?.showWalletUi();
};

const showCheckout = async () => {
  await torus?.showCheckout();
};

const showSwap = async () => {
  await torus?.showSwap({ show: true, fromToken: "ETH" });
};

const copyAccountAddress = () => {
  navigator.clipboard.writeText(account.value);
  isCopied.value = true;
  setTimeout(() => {
    isCopied.value = false;
  }, 1000);
};

const uiConsole = (...args) => {
  const el = document.querySelector("#console>pre");
  const h1 = document.querySelector("#console>h1");
  const consoleBtn = document.querySelector("#console>div.clear-console-btn");
  if (h1) {
    h1.innerHTML = args[0];
  }
  if (el) {
    el.innerHTML = JSON.stringify(args[1] || {}, null, 2);
  }
  if (consoleBtn) {
    consoleBtn.style.display = "block";
  }
};

const clearConsole = () => {
  const el = document.querySelector("#console>pre");
  const h1 = document.querySelector("#console>h1");
  const consoleBtn = document.querySelector("#console>div.clear-console-btn");
  if (h1) {
    h1.innerHTML = "";
  }
  if (el) {
    el.innerHTML = "";
  }
  if (consoleBtn) {
    consoleBtn.style.display = "none";
  }
};

</script>

<template>
  <!-- Loader -->
  <div v-if="isLoading" class="loader-container">
    <Loader :use-spinner="true" :classes="{ spinnerMask: '!bg-transparent' }" />
  </div>
  <!-- Login -->
  <div v-else-if="!account" class="login-container">
    <h1 class="login-heading">Demo</h1>

    <div>
      <div class="select-label">Build Environment</div>
      <select v-model="selectedBuildEnv" class="select">
        <option v-for="login in Object.values(WS_EMBED_BUILD_ENV)" :key="login" :value="login">{{ login }}</option>
      </select>
    </div>

    <div class="login-btn">
      <Button variant="primary" @on-click="login">Login</Button>
    </div>
    <div class="sessionId-input">
      <TextField v-model="sessionId" placeholder="Enter Session Id..." />
      <Button @on-click="loginWithSessionId">Login with Session Id</Button>
    </div>
  </div>
  <div v-else class="dashboard-container">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="heading-mb">
        <h1 class="dashboard-heading">Demo</h1>
        <p class="dashboard-subheading">Build Environment : {{ selectedBuildEnv }}</p>
      </div>
      <div class="dashboard-action-container">
        <div class="header-mb">
          <Button variant="tertiary" small class="network" classes="flex gap-1 items-center">
            <Icon name="wifi-solid-icon" size="16" />
            <p class="text-xs">{{ currentNetwork }}</p>
          </Button>
          <Button variant="tertiary" classes="flex gap-2 w-fit !text-xs" class="!w-auto" small :title="account" @click.stop="copyAccountAddress">
            <p class="text-xs">{{ formattedAccountAddress }}</p>
          </Button>
        </div>
        <Button variant="secondary" classes="flex gap-1 !text-xs" class="!w-auto" small @click.stop="logout">
          <!-- <img class="logout-img" :src="require('@/assets/logout.svg')" alt="logout" height="14" width="14" /> -->
          <p class="text-xs">Logout</p>
        </Button>
      </div>
    </div>
    <!-- Dashboard Action Container -->
    <div class="dashboard-details-container">
      <div class="dashboard-details-btn-container">
        <div class="details-container">
          <div>
            <div class="flex-row">
              <Button @on-click="getUserInfo">Get User Info</Button>
              <Button @on-click="showWalletConnect">Show Wallet Connect</Button>
            </div>
            <div class="flex-row">
              <Button @on-click="showCheckout">Show Checkout</Button>
              <Button @on-click="showWalletUi">Show Wallet</Button>
            </div>
            <div class="flex-row">
              <Button @on-click="showSwap">Show Swap</Button>
            </div>
          </div>
          <!-- <Ethereum :ws-embed="wsEmbed" :account="account" :chain-id="chainId" /> -->
        </div>
      </div>
      <!-- Dashboard Console Container -->
      <div id="console" class="dashboard-details-console-container">
        <h1 class="console-heading"></h1>
        <pre class="console-container"></pre>
        <div class="clear-console-btn">
          <Button :pill="false" :block="false" small @on-click="clearConsole">Clear console</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "./Dashboard.css";
</style>
