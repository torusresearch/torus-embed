<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import Torus from '@toruslabs/torus-embed';
import Button from "./Button";

defineProps({
  msg: String,
});

let torus = undefined;

const isLoading = ref(false);
const selectedBuildEnv = ref('production');
const account = ref("");

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
    console.log(">>> login");
    isLoading.value = true;
    await initializeTorus();
    // Note: can pass authConnection and login_hint as params if you want to preselect a provider and login identifier eg. email
    // const loginaccs = await torus?.login({ authConnection: "google", login_hint: "sample@gmail.com" });

    // Passing empty will trigger showing the login modal showing all login provider options
    const loginaccs = await torus?.login();
    console.log("loginaccs", loginaccs);
    account.value = (loginaccs || [])[0] || "";
    isLoading.value = false;

    // getCurrentChain();

    sessionStorage.setItem("ws_embed_build_env", selectedBuildEnv.value);
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};

// const loginWithSessionId = async () => {
//   try {
//     isLoading.value = true;

//     await initializeWsEmbed();

//     // namespace is hostname of current origin
//     const result = await wsEmbed?.loginWithSessionId({ sessionId: sessionId.value, sessionNamespace: window.location.hostname });
//     isLoading.value = false;
//     if (result) {
//       const loginaccs = await wsEmbed?.login();
//       console.log("accounts", loginaccs);
//       account.value = loginaccs?.[0] || "";
//     }

//     getCurrentChain();
//   } catch (error) {
//     console.error(error);
//     isLoading.value = false;
//   }
// };

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

const copyAccountAddress = () => {
  navigator.clipboard.writeText(account.value);
  isCopied.value = true;
  setTimeout(() => {
    isCopied.value = false;
  }, 1000);
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

    <!-- <div>
      <div class="select-label">Build Environment</div>
      <select v-model="selectedBuildEnv" class="select">
        <option v-for="login in Object.values(WS_EMBED_BUILD_ENV)" :key="login" :value="login">{{ login }}</option>
      </select>
    </div> -->

    <div class="login-btn">
      <Button variant="primary" @on-click="login">Login</Button>
    </div>
    <!-- <div class="sessionId-input">
      <TextField v-model="sessionId" placeholder="Enter Session Id..." />
      <Button @on-click="loginWithSessionId">Login with Session Id</Button>
    </div> -->
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
          <!-- <Button variant="tertiary" small class="network" classes="flex gap-1 items-center">
            <Icon name="wifi-solid-icon" size="16" />
            <p class="text-xs">{{ currentNetwork }}</p>
          </Button> -->
          <Button variant="tertiary" classes="flex gap-2 w-fit !text-xs" class="!w-auto" small :title="account" @click.stop="copyAccountAddress">
            <Icon v-if="isCopied" name="check-circle-solid-icon" size="16" />
            <Icon v-else name="document-duplicate-solid-icon" size="16" />
            <p class="text-xs">{{ formattedAccountAddress }}</p>
          </Button>
        </div>
        <Button variant="secondary" classes="flex gap-1 !text-xs" class="!w-auto" small @click.stop="logout">
          <!-- <img class="logout-img" :src="require('@/assets/logout.svg')" alt="logout" height="14" width="14" /> -->
          <p class="text-xs">Logout</p>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
