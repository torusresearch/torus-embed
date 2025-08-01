<script lang="ts" setup>
import { METHOD_TYPES, POLYGON_AMOY_CHAIN_ID, SEPOLIA_CHAIN_ID, TRANSACTION_ENVELOPE_TYPES } from "@toruslabs/ethereum-controllers";
import { TextField } from "@toruslabs/vue-components/TextField";
import {
  BrowserProvider,
  Contract,
  ContractFactory,
  ethers,
  formatEther,
  parseEther,
  parseUnits,
  recoverAddress,
  TypedDataEncoder,
  verifyMessage,
} from "ethers";
import { ref, watch } from "vue";
import Torus from '@toruslabs/torus-embed';

import { getV4TypedData } from "./data";

import Constants from "./constants";
import Button from "../Button";

// const currentUrl = new URL(window.location.href);
// const forwarderOrigin = currentUrl.hostname === "localhost" ? "http://localhost:9010" : undefined;
const piggyBackContractAddress = ref("");
const hstTokenContractAddress = ref("");

const props = defineProps<{
  torus?: Torus;
  account: string;
  chainId: string;
}>();

let ethersProvider: BrowserProvider | null = null;

const switchChainTo = ref<string>("0x1");

// Contract Constants
const { piggybankBytecode, piggybankAbi, hstBytecode, hstAbi, nftsAbi, nftsBytecode, erc1155Abi, erc1155Bytecode } = Constants;
const tokenSymbol = "HST";

// Piggy Contract
let piggybankContract: Contract | null = null;
let piggybankFactory: ContractFactory | null = null;

// Send Tokens
let hstContract: Contract | null = null;
let hstFactory: ContractFactory | null = null;
const decimalUnitsInput = ref<number>(4);
const tokenAddresses = ref("");
const approveTokensToInput = ref("0x9bc5baF874d2DA8D216aE9f137804184EE5AfEF4");

// NFT Contract
let nftsFactory: ContractFactory | null = null;
let nftsContract: Contract | null = null;
const nftContractAddress = ref("");

// ERC 1155
let erc1155Factory: ContractFactory | null = null;
let erc1155Contract: Contract | null = null;
const erc1155ContractAddress = ref("");

const initializeContracts = async () => {
  try {
    const runner = await ethersProvider?.getSigner();
    const piggyBankAddress = localStorage.getItem("piggy_bank_address");
    if (piggyBankAddress) {
      piggyBackContractAddress.value = piggyBankAddress;
      piggybankContract = new ethers.Contract(piggyBackContractAddress.value, piggybankAbi, runner);
    }
    const hstTokenAddress = localStorage.getItem("hst_token_address");
    if (hstTokenAddress) {
      hstTokenContractAddress.value = hstTokenAddress;
      hstContract = new ethers.Contract(hstTokenContractAddress.value, hstAbi, runner);
    }
    const nftAddress = localStorage.getItem("nft_address");
    if (nftAddress) {
      nftContractAddress.value = nftAddress;
      nftsContract = new ethers.Contract(nftContractAddress.value, nftsAbi, runner);
    }
    const erc1155Address = localStorage.getItem("erc1155_address");
    if (erc1155Address) {
      erc1155ContractAddress.value = erc1155Address;
      erc1155Contract = new ethers.Contract(erc1155Address, erc1155Abi, runner);
    }

    nftsFactory = new ContractFactory(nftsAbi, nftsBytecode, runner);
    piggybankFactory = new ContractFactory(piggybankAbi, piggybankBytecode, runner);
    hstFactory = new ContractFactory(hstAbi, hstBytecode, runner);
    erc1155Factory = new ethers.ContractFactory(erc1155Abi, erc1155Bytecode, runner);
  } catch (error) {
    console.error("Error", error);
  }
};

watch(
  () => props.torus,
  (newTorus: Torus | undefined) => {
    if (newTorus) {
      ethersProvider = new BrowserProvider(newTorus.provider, "any");
    }
  },
  { immediate: true }
);

watch(
  () => props.account,
  (newAccount: string) => {
    if (newAccount) {
      initializeContracts();
    }
  },
  { immediate: true }
);

watch(
  () => props.chainId,
  (newChainId: string) => {
    if (newChainId) {
      switchChainTo.value = props.chainId !== POLYGON_AMOY_CHAIN_ID ? POLYGON_AMOY_CHAIN_ID : SEPOLIA_CHAIN_ID;
    }
  },
  { immediate: true }
);

const getBalance = async () => {
  const weiBalance = await ethersProvider?.getBalance(props.account);
  const balance = weiBalance ? formatEther(weiBalance) : "0";
  uiConsole("Balance", { balance });
};

const getPublicKey = async () => {
  try {
    const publicKey = await ethersProvider?.send(METHOD_TYPES.ETH_PUBLIC_KEY, []);
    uiConsole(`Success`, { publicKey });
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

const signPersonalMsg = async () => {
  try {
    uiConsole("Initiating personal sign");
    const message = "Example `personal_sign` messages";
    const from = props.account;
    let personalSignVerifySigUtilResult = "";
    // const signedMessage = await ethersProvider?.send("personal_sign", [message, props.account]);
    const msg = `0x${Buffer.from(message, "utf8").toString("hex")}`;
    const signedMessage = (await props.torus?.provider.request({
      method: METHOD_TYPES.PERSONAL_SIGN,
      params: [msg, from, "Example password"],
    })) as string;

    // Verify
    const recoveredAddr = verifyMessage(message, signedMessage);

    if (recoveredAddr.toLowerCase() === from.toLowerCase()) {
      console.log(`SigUtil Successfully verified signer as ${recoveredAddr}`);
      personalSignVerifySigUtilResult = recoveredAddr;
    } else {
      throw new Error(`SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`);
    }

    uiConsole(`Success`, { signedMessage, verify: personalSignVerifySigUtilResult });
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

const signEth = async () => {
  try {
    uiConsole("Initiating sign eth");
    let signEthResult = "";
    const message = "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";
    // const signedMessage = await wsEmbed?.provider?.sendAsync({ method: "eth_sign", params: { data: message, from: props.account } });
    const signedMessage = await ethersProvider?.send(METHOD_TYPES.ETH_SIGN, [props.account, message]);

    const from = props.account;
    const recoveredAddr = recoverAddress(message, signedMessage);
    if (recoveredAddr.toLowerCase() === from.toLowerCase()) {
      console.log(`SigUtil Successfully verified signer as ${recoveredAddr}`);
      signEthResult = recoveredAddr;
    } else {
      throw new Error(`SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`);
    }
    uiConsole(`Success`, { signedMessage, verify: signEthResult });
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

const signTypedData_v4 = async () => {
  try {
    uiConsole("Initiating sign typed data v4");
    const typedData = getV4TypedData(props.chainId);
    let signTypedDataV4VerifyResult = "";
    // const signedMessage = await ethersProvider?.send("eth_signTypedData_v4", [props.account, JSON.stringify(typedData)]);

    const from = props.account;
    const signedMessage = (await props.torus?.provider.request({
      method: METHOD_TYPES.ETH_SIGN_TYPED_DATA_V4,
      params: [from, JSON.stringify(typedData)],
    })) as string;

    const msg = TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
    const recoveredAddr = recoverAddress(msg, signedMessage);
    if (recoveredAddr.toLowerCase() === from.toLowerCase()) {
      console.log(`Successfully verified signer as ${recoveredAddr}`);
      signTypedDataV4VerifyResult = recoveredAddr;
    } else {
      throw new Error(`Failed to verify signer when comparing ${recoveredAddr} to ${from}`);
    }
    uiConsole(`Success`, { signedMessage, verify: signTypedDataV4VerifyResult });
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

const sendEthLegacy = async () => {
  try {
    uiConsole("Initiating send eth legacy");
    const signer = await ethersProvider?.getSigner();
    const result = await signer?.sendTransaction({
      from: props.account,
      to: props.account,
      value: parseUnits("0.00001", "ether"),
      type: parseInt(TRANSACTION_ENVELOPE_TYPES.LEGACY, 16),
      gasLimit: 21000,
    });

    // const result = await wsEmbed?.provider.request({
    //   method: "eth_sendTransaction",
    //   params: [
    //     {
    //       from: props.account,
    //       to: props.account,
    //       value: "0x0",
    //       gasLimit: "0x5208",
    //       gasPrice: "0x2540be400",
    //       type: TRANSACTION_ENVELOPE_TYPES.LEGACY,
    //     },
    //   ],
    // });

    uiConsole(`Success`, { txHash: result });
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

const sendEthEIP1559 = async () => {
  try {
    uiConsole("Initiating send eth eip1559");
    const signer = await ethersProvider?.getSigner();
    const result = await signer?.sendTransaction({
      from: props.account,
      to: props.account,
      value: parseUnits("0.00001", "ether"),
      type: parseInt(TRANSACTION_ENVELOPE_TYPES.FEE_MARKET, 16),
      gasLimit: 21000,
    });

    // const result = await wsEmbed?.provider.request({
    //   method: "eth_sendTransaction",
    //   params: [
    //     {
    //       from: props.account,
    //       to: props.account,
    //       value: "0x0",
    //       gasLimit: "0x5028",
    //       maxFeePerGas: "0x2540be400",
    //       maxPriorityFeePerGas: "0x3b9aca00",
    //     },
    //   ],
    // });

    uiConsole(`Success`, { txHash: result });
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

const getCurrentChain = async () => {
  uiConsole("Getting current chain");
  const currentChainId = (await ethersProvider?.send("eth_chainId", [])) as string;
  uiConsole("Current Network", { chainId: currentChainId });
};

const switchChain = async () => {
  try {
    uiConsole("Initiating switch chain");
    // const result = await wsEmbed?.provider?.request({
    //   method: "wallet_switchEthereumChain",
    //   params: {
    //     chainId: "0x13882",
    //   },
    // });
    const result = await ethersProvider?.send("wallet_switchEthereumChain", [
      {
        chainId: switchChainTo.value,
      },
    ]);

    uiConsole(`Success`, result);
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

const addChain = async () => {
  try {
    uiConsole("Initiating add chain");
    // const result = await wsEmbed?.provider?.request({
    //   method: "wallet_addEthereumChain",
    //   params: {
    //     chainId: "0xe708",
    //     chainName: "Linea",
    //     nativeCurrency: {
    //       name: "ETH",
    //       symbol: "ETH",
    //       decimals: 18,
    //     },
    //     rpcUrls: ["https://linea.drpc.org"],
    //     blockExplorerUrls: ["https://lineascan.build"],
    //   },
    // });
    const result = await ethersProvider?.send("wallet_addEthereumChain", [
      {
        chainId: "0xe708",
        chainName: "Linea",
        nativeCurrency: {
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: ["https://linea.drpc.org"],
        blockExplorerUrls: ["https://lineascan.build"],
      },
    ]);
    switchChainTo.value = "0xe708";
    uiConsole(`Success`, result);
  } catch (error) {
    console.error(error);
    uiConsole("Failed", (error as Error).message);
  }
};

// NFTs
const isDeployingNft = ref(false);
const deployNft = async () => {
  if (!nftsFactory) return;
  isDeployingNft.value = true;
  uiConsole("Deploying NFT");
  try {
    nftsContract = (await nftsFactory.deploy()) as Contract;
    const receipt = await nftsContract.deploymentTransaction()?.wait();

    nftContractAddress.value = await nftsContract.getAddress();
    if (!nftContractAddress.value) throw new Error("NFTs contract address not found");

    localStorage.setItem("nft_address", nftContractAddress.value);
    initializeContracts();
    uiConsole("Success", { address: nftContractAddress.value, transactionHash: receipt?.hash });
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  } finally {
    isDeployingNft.value = false;
  }
};

const mintAmount = ref(1);
const nftMinted = ref(false);
const mintNft = async () => {
  if (!nftsContract) return;
  try {
    uiConsole("Mint initiated");
    const receipt = await nftsContract.mintNFTs(mintAmount.value, {
      from: props.account,
    });
    nftMinted.value = true;
    uiConsole("Success", { receipt });
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  }
};

const approveNftTokenAmount = ref(1);
const approveNftToken = async () => {
  if (!nftsContract) return;
  try {
    uiConsole("Approve initiated");
    let result = await nftsContract.approve("0x9bc5baF874d2DA8D216aE9f137804184EE5AfEF4", approveNftTokenAmount.value, {
      from: props.account,
    });
    result = await result.wait();
    uiConsole("Success", { result });
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  }
};

const transferNftTokenAmount = ref(1);
const transferNftFrom = async () => {
  if (!nftsContract) return;
  try {
    uiConsole("Transfer From initiated");
    let result = await nftsContract.transferFrom(props.account, "0x2f318C334780961FB129D2a6c30D0763d9a5C970", transferNftTokenAmount.value, {
      from: props.account,
    });
    result = await result.wait();
    uiConsole("Success", { result });
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  }
};

// ERC 1155
const deployingErc1155 = ref(false);
const deployErc1155 = async () => {
  if (!erc1155Factory) return;
  deployingErc1155.value = true;
  uiConsole("Deploying ERC1155");
  try {
    erc1155Contract = (await erc1155Factory.deploy()) as Contract;
    const receipt = await erc1155Contract.deploymentTransaction()?.wait();

    erc1155ContractAddress.value = await erc1155Contract.getAddress();
    if (!erc1155ContractAddress.value) throw new Error("ERC 1155 contract address not found");

    localStorage.setItem("erc1155_address", erc1155ContractAddress.value);
    initializeContracts();
    uiConsole("Success", { address: erc1155ContractAddress.value, transactionHash: receipt?.hash });
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  } finally {
    deployingErc1155.value = false;
  }
};

const erc1155Minted = ref(false);
const erc1155BatchMintTokenIds = ref("");
const erc1155BatchMintTokenAmounts = ref("");
const erc1155BatchMint = async () => {
  if (!erc1155Contract) return;
  uiConsole("Batch Mint initiated");
  try {
    const batchMintTokenIds = erc1155BatchMintTokenIds.value.split(",").map(Number);
    const batchMintTokenAmounts = erc1155BatchMintTokenAmounts.value.split(",").map(Number);

    const params = [props.account, batchMintTokenIds, batchMintTokenAmounts, "0x"];
    const result = await erc1155Contract.mintBatch(...params);
    uiConsole("Success", { result });
    erc1155Minted.value = true;
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  }
};

const erc1155BatchTransferTokenIds = ref("");
const erc1155BatchTransferTokenAmounts = ref("");
const erc1155BatchTransfer = async () => {
  if (!erc1155Contract) return;
  uiConsole("Batch Transfer initiated");
  try {
    const batchTransferTokenIds = erc1155BatchTransferTokenIds.value.split(",").map(Number);
    const batchTransferTokenAmounts = erc1155BatchTransferTokenAmounts.value.split(",").map(Number);

    const params = [props.account, "0x2f318C334780961FB129D2a6c30D0763d9a5C970", batchTransferTokenIds, batchTransferTokenAmounts, "0x"];
    const result = await erc1155Contract.safeBatchTransferFrom(...params);

    uiConsole("Success", { result });
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  }
};

const setApprovalForAllERC1155Button = async () => {
  if (!erc1155Contract) return;
  uiConsole("Set Approval For All initiated");
  try {
    let result = await erc1155Contract.setApprovalForAll("0x9bc5baF874d2DA8D216aE9f137804184EE5AfEF4", true, {
      from: props.account,
    });
    result = await result.wait();
    uiConsole("Success", { result });
  } catch (error) {
    uiConsole("Failed", (error as Error).message);
  }
};

const uiConsole = (...args: unknown[]): void => {
  const el = document.querySelector("#console>pre");
  const h1 = document.querySelector("#console>h1");
  const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
  if (h1) {
    h1.innerHTML = args[0] as string;
  }
  if (el) {
    el.innerHTML = JSON.stringify(args[1] || {}, null, 2);
  }
  if (consoleBtn) {
    consoleBtn.style.display = "block";
  }
};

const deployPiggyContract = async () => {
  console.log('>>> trigger deploy')
  try {
    uiConsole("Deploying piggy contract");
    if (piggybankFactory) {
      piggybankContract = (await piggybankFactory.deploy()) as Contract;
      const receipt = await piggybankContract.deploymentTransaction()?.wait();
      const piggyContractAddress = await piggybankContract.getAddress();

      if (piggyContractAddress === undefined) {
        return;
      }
      localStorage.setItem("piggy_bank_address", piggyContractAddress);
      initializeContracts();
      uiConsole("Piggy Contract Deployed", `Contract mined! address: ${piggyContractAddress} transactionHash: ${receipt?.hash}`);
    }
  } catch (error) {
    uiConsole("Piggy Contract Deployed Error", error);
  }
};

const depositPiggyContract = async () => {
  try {
    uiConsole("Initiating piggy contract deposit");
    if (piggybankContract) {
      const result = await piggybankContract.deposit({
        from: props.account,
        value: parseEther("0.01"),
      });
      console.log(result);
      const receipt = await result.wait();
      console.log(receipt);
      uiConsole("Piggy Contract Deposit", receipt);
    }
  } catch (error) {
    uiConsole("Piggy Contract Deposit Error", error);
  }
};

const withdrawPiggyContract = async () => {
  try {
    uiConsole("Initiating withdraw piggy contract");
    if (piggybankContract) {
      const result = await piggybankContract.withdraw(parseEther("0.001"), {
        from: props.account,
      });
      console.log(result);
      const receipt = await result.wait();
      console.log(receipt);
      uiConsole("Piggy Contract Withdraw", receipt);
    }
  } catch (error) {
    uiConsole("Piggy Contract Withdraw Error", error);
  }
};

const createToken = async () => {
  try {
    uiConsole("Creating token");
    if (hstFactory) {
      const _initialAmount = 10;
      const _tokenName = "HST";
      hstContract = (await hstFactory.deploy(_initialAmount, _tokenName, decimalUnitsInput.value, tokenSymbol)) as Contract;
      const receipt = await hstContract?.deploymentTransaction()?.wait();
      const address = await hstContract.getAddress();
      tokenAddresses.value = address;
      if (address === undefined) {
        return;
      }
      localStorage.setItem("hst_token_address", address);
      initializeContracts();
      console.log("Create Token Success", `Contract mined! address: ${address} transactionHash: ${receipt?.hash}`);
      uiConsole("Create Token Success", { address, transactionHash: receipt?.hash });
    }
  } catch (error) {
    uiConsole("Create Token Error", error);
  }
};

// const addTokenToWallet = async () => {
//   const contractAddresses = tokenAddresses.value.split(", ");

//   const promises = contractAddresses.map((erc20Address) => {
//     return wsEmbed?.provider.request({
//       method: "wallet_watchAsset",
//       params: {
//         type: "ERC20",
//         options: {
//           address: erc20Address,
//           symbol: tokenSymbol,
//           decimals: decimalUnitsInput.value,
//           image: "https://metamask.github.io/test-dapp/metamask-fox.svg",
//         },
//       },
//     });
//   });

//   Promise.all(promises).then((result) => {
//     console.log("result", result);
//   });
// };

const transferTokens = async () => {
  try {
    uiConsole("Initiating transfer token");
    if (hstContract) {
      const result = await hstContract.transfer(
        "0x2f318C334780961FB129D2a6c30D0763d9a5C970",
        decimalUnitsInput.value.toString() === "0" ? 1 : `${1.5 * 10 ** decimalUnitsInput.value}`,
        {
          from: props.account,
          gasLimit: 60000,
          gasPrice: "20000000000",
        }
      );
      console.log("result", result);
      uiConsole("Transfer Token Success", result);
    }
  } catch (error) {
    uiConsole("Transfer Token Error", error);
  }
};

const approveTokens = async () => {
  try {
    uiConsole("Initiating approve token");
    if (hstContract) {
      const result = await hstContract.approve(approveTokensToInput.value, `${7 * 10 ** decimalUnitsInput.value}`, {
        from: props.account,
        gasLimit: 60000,
        gasPrice: "20000000000",
      });
      console.log("result", result);
      uiConsole("Approve Token Success", result);
    }
  } catch (error) {
    uiConsole("Approve Token Error", error);
  }
};
</script>

<template>
  <div>
    <div class="flex-row">
      <Button @on-click="getCurrentChain">Get Current Network</Button>
      <Button @on-click="getBalance">Get Balance</Button>
    </div>
    <div class="flex-row">
      <Button @on-click="getPublicKey">Get Public Key</Button>
    </div>

    <div class="divider" />

    <div class="flex-row">
      <Button label="Add Chain" @on-click="addChain">Add Chain</Button>
      <Button label="Switch Chain" @on-click="switchChain">Switch Chain {{ switchChainTo }}</Button>
    </div>

    <div class="divider" />

    <div>
      <p class="btn-label">Signing</p>
      <div class="flex-row">
        <Button @on-click="signPersonalMsg">Personal Sign</Button>
        <Button @on-click="signEth">ETH Sign</Button>
      </div>
      <div class="flex-row">
        <Button @on-click="signTypedData_v4">Typed data v4</Button>
      </div>

      <div class="divider" />

      <p class="btn-label">Send ETH</p>
      <div class="flex-row">
        <Button @on-click="sendEthLegacy">Send Legacy Transaction</Button>
        <Button @on-click="sendEthEIP1559">Send EIP 1559 Transaction</Button>
      </div>

      <div class="divider" />

      <p class="btn-label">Piggy Bank Contract</p>
      <div class="flex-row">
        <Button @on-click="deployPiggyContract">Deploy Contract</Button>
        <Button :disabled="!piggyBackContractAddress" @on-click="depositPiggyContract">Deposit</Button>
        <Button :disabled="!piggyBackContractAddress" @on-click="withdrawPiggyContract">Withdraw</Button>
      </div>

      <div class="divider" />

      <p class="btn-label">Send Tokens</p>
      <div class="mt-2 flex-row">
        <p class="mr-2 w-max text-sm text-app-gray-900">Token Decimals :</p>
        <input v-model="decimalUnitsInput" type="number" placeholder="0.00" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
      </div>
      <div class="flex-row">
        <Button @on-click="createToken">Create Token</Button>
      </div>
      <div class="flex-row">
        <Button :disabled="!hstTokenContractAddress" @on-click="transferTokens">Transfer Token</Button>
      </div>
      <div class="flex-row">
        <p class="mr-2 w-max text-sm text-app-gray-900">Approve to Address :</p>
        <input v-model="approveTokensToInput" disabled pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
      </div>
      <div class="flex-row">
        <Button :disabled="!hstTokenContractAddress" @on-click="approveTokens">Approve Token</Button>
      </div>

      <div class="divider" />

      <p class="btn-label">NFTs</p>
      <div class="flex-row">
        <Button :loading="isDeployingNft" @on-click="deployNft">Deploy</Button>
      </div>
      <div class="flex-row">
        <p class="mr-2 w-max text-sm text-app-gray-900">Amount :</p>
        <input v-model="mintAmount" placeholder="0" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
        <Button :disabled="!nftContractAddress" @on-click="mintNft">Mint</Button>
      </div>
      <div class="flex-row">
        <p class="mr-2 w-max text-sm text-app-gray-900">Approve Token :</p>
        <input v-model="approveNftTokenAmount" placeholder="0" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
        <Button :disabled="!nftMinted" @on-click="approveNftToken">Approve</Button>
      </div>
      <div class="flex-row">
        <p class="mr-2 w-max text-sm text-app-gray-900">Transfer Token :</p>
        <input v-model="transferNftTokenAmount" placeholder="0" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
        <Button :disabled="!nftMinted" @on-click="transferNftFrom">Transfer From</Button>
      </div>

      <div class="divider" />

      <p class="btn-label">ERC 1155</p>
      <div class="flex-row">
        <Button :disabled="deployingErc1155" @on-click="deployErc1155">Deploy</Button>
      </div>
      <div class="flex-row">
        <p class="mr-2 w-max text-sm text-app-gray-900">Batch Mint Token IDs:</p>
        <input v-model="erc1155BatchMintTokenIds" placeholder="1, 2, 3" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
        <p class="mr-2 w-max text-sm text-app-gray-900">Batch Mint Token ID Amounts</p>
        <input v-model="erc1155BatchMintTokenAmounts" placeholder="1, 1, 10000000" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
      </div>
      <div class="flex-row">
        <Button :disabled="!erc1155ContractAddress" @on-click="erc1155BatchMint">Batch Mint</Button>
      </div>
      <div class="flex-row">
        <p class="mr-2 w-max text-sm text-app-gray-900">Batch Transfer Token IDs:</p>
        <input v-model="erc1155BatchTransferTokenIds" placeholder="1, 2, 3" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
        <p class="mr-2 w-max text-sm text-app-gray-900">Batch Transfer Amounts</p>
        <input v-model="erc1155BatchTransferTokenAmounts" placeholder="1, 1, 1" pill :classes="{ input: '!text-app-gray-900 !text-sm' }" />
      </div>
      <div class="flex-row">
        <Button :disabled="!erc1155Minted" @on-click="erc1155BatchTransfer">Batch Transfer</Button>
      </div>
      <div class="flex-row">
        <Button :disabled="!erc1155Minted" @on-click="setApprovalForAllERC1155Button">Set Approval For All</Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "Dashboard.css";
</style>
