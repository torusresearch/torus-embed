import type Torus from "@toruslabs/torus-embed";
import type { TORUS_BUILD_ENV_TYPE, TorusInpageProvider, VerifierArgs } from "@toruslabs/torus-embed";

import { useEffect, useState } from "react";

import Web3 from 'web3';
import { AbstractProvider } from 'web3-core';
import { encrypt, recoverTypedMessage } from "eth-sig-util";
import { keccak256 } from 'ethers/lib/utils';
import { ethers } from "ethers";
import { getV3TypedData, getV4TypedData, whiteLabelData } from "../data";
import tokenAbi from "human-standard-token-abi";
const chainIdNetworkMap = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'goerli',
  42: 'kovan',
  97: 'bsc_testnet',
  56: 'bsc_mainnet',
} as Record<string, string>;


type Web3Object = {
    web3: Web3;
    torus: Torus | null;
    setweb3: (provider: TorusInpageProvider) => void;
};
const web3Obj: Web3Object = {
  web3: new Web3(),
  torus: null,
  setweb3(provider): void {
    web3Obj.web3.setProvider(provider as AbstractProvider);
  },
};

export default function Home() {
  const [publicAddress, setPublicAddress] = useState("");
  const [chainId, setChainId] = useState(4);
  const [verifierId, setVerifierId] = useState("");
  const [selectedVerifier, setSelectedVerifier] = useState("google");
  const [placeholder, setPlaceholder] = useState("Enter google email");
  const [messageToEncrypt, setMessageToEncrypt] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [messageEncrypted, setEncryptedMessage] = useState("");
  const [buildEnv, setBuildEnv] = useState<TORUS_BUILD_ENV_TYPE>("testing");
  useEffect(()=>{
    const initialize = async () => {
      const torus = (await import("@toruslabs/torus-embed")).default;
      web3Obj.torus = new torus({});
      const torusEnv = sessionStorage.getItem('pageUsingTorus');
      if (torusEnv) {
        login();
      }
    }
    initialize();
  }, [])

  const login = async (): Promise<void> => {
    try {
      const { torus, web3 } = web3Obj;
      await torus.init({
        buildEnv,
        enabledVerifiers: {
          reddit: false,
        },
        enableLogging: true,
        network: {
          host: chainIdNetworkMap[chainId.toString()], // mandatory
          chainId,
          // chainId: 336,
          // networkName: 'DES Network',
          // host: 'https://quorum.block360.io/https',
          // ticker: 'DES',
          // tickerName: 'DES Coin',
        },
        showTorusButton: true,
        integrity: {
          version: '1.11.0',
          check: false,
          // hash: 'sha384-jwXOV6VJu+PM89ksbCSZyQRjf5FdX8n39nWfE/iQBMh4r5m027ua2tkQ+83FPdp9'
        },
        loginConfig: buildEnv === 'lrc' ? {
          'torus-auth0-email-passwordless': {
            name: 'torus-auth0-email-passwordless',
            typeOfLogin: 'passwordless',
            showOnModal: false,
          },
        } : undefined,
        whiteLabel: whiteLabelData,
        skipTKey: true,
      });
      await torus.login(); // await torus.ethereum.enable()
      sessionStorage.setItem('pageUsingTorus', buildEnv);
      web3Obj.setweb3(torus.provider);
      torus.provider.on('chainChanged', (resp) => {
        console.log(resp, 'chainchanged');
        setChainId(parseInt(resp.toString(), 10))
      });
      torus.provider.on('accountsChanged', (accounts) => {
        console.log(accounts, 'accountsChanged');
        setPublicAddress((Array.isArray(accounts) && accounts[0]) || '');
      });
      const accounts = await web3.eth.getAccounts();
      setPublicAddress((Array.isArray(accounts) && accounts[0]) || '');

      web3.eth.getBalance(accounts[0]).then(console.log).catch(console.error);
    } catch (error) {
      console.error(error, 'caught in vue-app');
    }
  }

  const toggleTorusWidget = (): void => {
    const { torus } = web3Obj;
    if (torus.torusWidgetVisibility) {
      torus.hideTorusButton();
    } else {
      torus.showTorusButton();
    }
  }

  const onSelectedVerifierChanged = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const verifier = e.target.value;
    let placeholder = 'Enter google email';
    switch (verifier) {
      case 'google':
        placeholder = 'Enter google email';
        break;
      case 'reddit':
        placeholder = 'Enter reddit username';
        break;
      case 'discord':
        placeholder = 'Enter discord ID';
        break;
      default:
        placeholder = 'Enter google email';
        break;
    }
    setSelectedVerifier(verifier)
    setPlaceholder(placeholder)
  }

  const changeProvider = async () => {
    await web3Obj.torus.setProvider({ host: 'ropsten' });
    printConsole('finished changing provider');
  }

  const createPaymentTx = async (): Promise<void> => {
    try {
      const { torus } = web3Obj;
      const res = await torus.initiateTopup('mercuryo', {
        selectedCurrency: 'USD',
      });
      console.log(res);
    } catch (error) {
      console.error(error);
    }
  }

  const sendEth = (): void => {
    const { web3 } = web3Obj;
    web3.eth
      .sendTransaction({ from: publicAddress, to: publicAddress, value: web3.utils.toWei('0.01') })
      .then((resp) => printConsole(resp))
      .catch(console.error);
  }

  const signMessageWithoutPopup = (): void => {
    const { web3 } = web3Obj;

    // hex message
    const message = 'Hello world';
    const customPrefix = `\u0019${window.location.hostname} Signed Message:\n`;
    const prefixWithLength = Buffer.from(`${customPrefix}${message.length.toString()}`, 'utf-8');
    const hashedMsg = keccak256(Buffer.concat([prefixWithLength, Buffer.from(message)]));
    (web3.currentProvider as any)?.send(
      {
        method: 'eth_sign',
        params: [publicAddress, hashedMsg, { customPrefix, customMessage: message }],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const signerAddress = ethers.utils.recoverAddress(hashedMsg, result.result);
        return printConsole(
          'sign message => true',
          `message: ${prefixWithLength + message}`,
          `msgHash: ${hashedMsg}`,
          `sig: ${result.result}`,
          `signer: ${signerAddress}`,
        );
      },
    );
  }

  const signMessage = (): void => {
    const { web3 } = web3Obj;
    // hex message
    const message = '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad';
    (web3.currentProvider as any)?.send(
      {
        method: 'eth_sign',
        params: [publicAddress, message],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        return printConsole('sign message => true', result);
      },
    );
  }

  const signTypedDataV1 = (): void => {
    const typedData = [
      {
        type: 'string',
        name: 'message',
        value: 'Hi, Alice!',
      },
      {
        type: 'uint8',
        name: 'value',
        value: 10,
      },
    ];
    const currentProvider = web3Obj.web3.currentProvider as any;
    currentProvider.send(
      {
        method: 'eth_signTypedData',
        params: [typedData, publicAddress],
        jsonrpc: '2.0',
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
          'V1',
        );

        if (publicAddress && recovered.toLowerCase() === publicAddress?.toLowerCase()) {
          return printConsole(`sign typed message v1 => true, Singature: ${result.result} Recovered signer: ${publicAddress}`, result);
        }
        return printConsole(`Failed to verify signer, got: ${recovered}`);
      },
    );
  }

  const signTypedDataV3 = (): void => {
    const typedData = getV3TypedData(chainId);
    const currentProvider = web3Obj.web3.currentProvider as any;
    currentProvider.send(
      {
        method: 'eth_signTypedData_v3',
        params: [publicAddress, JSON.stringify(typedData)],
        jsonrpc: '2.0',
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
          'V3',
        );

        if (recovered.toLowerCase() === publicAddress?.toLowerCase()) {
          return printConsole(`sign typed message v3 => true, Singature: ${result.result} Recovered signer: ${publicAddress}`, result);
        }
        return printConsole(`Failed to verify signer, got: ${recovered}`);
      },
    );
  }

  const signTypedDataV4 = (): void => {
    const { web3 } = web3Obj;
    const typedData = getV4TypedData(chainId);
    (web3.currentProvider as any)?.send(
      {
        method: 'eth_signTypedData_v4',
        params: [publicAddress, JSON.stringify(typedData)],
        jsonrpc: '2.0',
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
          'V4',
        );

        if (recovered.toLowerCase() === publicAddress.toLowerCase()) {
          return printConsole('sign typed message v4 => true', result.result, `Recovered signer: ${publicAddress}`, result);
        }
        return printConsole(`Failed to verify signer, got: ${recovered}`);
      },
    );
  }

  const printConsole = (...args: any[]): void => {
    const el = document.querySelector('#console>p');
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  const sendDai = async (): Promise<void> => {
    try {
      const { torus, web3 } = web3Obj;
      if (chainId !== 1) {
        await torus.setProvider({ host: 'mainnet' });
      }
      const instance = new web3.eth.Contract(tokenAbi, '0x6b175474e89094c44da98b954eedeac495271d0f');
      const balance = await instance.methods.balanceOf(publicAddress).call();
      console.log(balance, 'dai balance');
      const value = Math.floor(parseFloat('0.01') * 10 ** parseFloat('18')).toString();
      if (Number(balance) < Number(value)) {
        // eslint-disable-next-line no-alert
        window.alert('You do not have enough dai tokens for transfer');
        return;
      }
      instance.methods.transfer(publicAddress, value).send(
        {
          from: publicAddress,
        },
        (err: Error, hash: string) => {
          if (err) printConsole(err);
          else printConsole(hash);
        },
      );
    } catch (error) {
      console.error(error);
    }
  }

  const approveKnc = async (): Promise<void> => {
    try {
      const { torus, web3 } = web3Obj;
      console.log(chainId, 'current chain id');
      if (chainId !== 1) {
        await torus.setProvider({ host: 'mainnet' });
      }
      const instance = new web3.eth.Contract(tokenAbi, '0xdd974D5C2e2928deA5F71b9825b8b646686BD200');
      let value = Math.floor(parseFloat('0.01') * 10 ** parseFloat('18')).toString();
      const allowance = await instance.methods.allowance(publicAddress, '0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3').call();
      console.log(allowance, 'current allowance');
      if (Number(allowance) > 0) value = '0';
      instance.methods.approve('0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3', value).send(
        {
          from: publicAddress,
        },
        (err: Error, hash: string) => {
          if (err) printConsole(err);
          else printConsole(hash);
        },
      );
    } catch (error) {
      console.error(error);
    }
  }

  const signPersonalMsg = async () : Promise<void> => {
    try {
      const { web3 } = web3Obj;
      const message = 'Some string';
      const hash = web3.utils.sha3(message) as string;
      const sig = await web3.eth.personal.sign(hash, publicAddress, '');
      const hostnamealAddress = await web3.eth.personal.ecRecover(hash, sig);
      if (publicAddress.toLowerCase() === hostnamealAddress.toLowerCase()) printConsole('Success');
      else printConsole('Failed');
    } catch (error) {
      console.error(error);
      printConsole('failed');
    }
  }

  const getUserInfo = (): void => {
    const { torus } = web3Obj;
    torus.getUserInfo('').then(printConsole).catch(printConsole);
  }

  const getPublicAddress = (): void => {
    const { torus } = web3Obj;
    console.log(selectedVerifier, verifierId);
    torus.getPublicAddress({ verifier: selectedVerifier, verifierId } as VerifierArgs).then(printConsole).catch(console.error);
  }

  const getEncryptionKey = (): void => {
    const { web3 } = web3Obj;
    (web3.currentProvider as any)?.send(
      {
        method: 'eth_getEncryptionPublicKey',
        params: [publicAddress],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        setEncryptionKey(result.result)
        return printConsole(`encryption public key => ${result.result}`);
      },
    );
  }

  const encryptMessage = (): void => {
    try {
      const messageEncrypted = encrypt(encryptionKey, { data: messageToEncrypt }, 'x25519-xsalsa20-poly1305');
      const encryptedMessage = stringifiableToHex(messageEncrypted);
      setEncryptedMessage(encryptedMessage)
      printConsole(`encrypted message => ${encryptedMessage}`);
    } catch (error) {
      console.error(error);
    }
  }

  const decryptMessage = (): void => {
    const { web3 } = web3Obj;
    (web3.currentProvider as any)?.send(
      {
        method: 'eth_decrypt',
        params: [messageEncrypted, publicAddress],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const decMsg = result.result;
        return printConsole(`decrypted message => ${decMsg}`);
      },
    );
  }

  const stringifiableToHex = (value: any): string => ethers.utils.hexlify(Buffer.from(JSON.stringify(value)))

  const logout = (): void => {
    web3Obj.torus.cleanUp()
      .then(() => {
        setPublicAddress("")
        return undefined;
      })
      .catch(console.error);
  }
  return (
    <div className="App">

      <div>
        <h3>Login With Torus</h3>
        <section>
          <p>
            Build Environment :
            {' '}
            {buildEnv.toString()}

          </p>
          {
            !publicAddress
              ? (
                <div>
                  <select name="buildEnv" value={buildEnv} onChange={(e) => setBuildEnv(e.target.value as TORUS_BUILD_ENV_TYPE)}>
                    <option value="production">Production</option>
                    <option value="binance">Binance</option>
                    <option selected value="testing">Testing</option>
                    <option value="development">Development</option>
                    <option value="lrc">LRC</option>
                    <option value="beta">Beta</option>
                  </select>
                  <button onClick={login}>Login</button>
                </div>
              )
              : <button onClick={()=>{}}>Logout</button>
          }

        </section>
        {
            publicAddress
        && (
        <section
          style={{
            fontSize: '12px',
          }}
        >
          <section>
            <div>
              Public Address:
              <i>{publicAddress.toString()}</i>
            </div>
            <div>
              Network:
              <i>{chainIdNetworkMap[chainId.toString()]}</i>
            </div>
          </section>
          <section style={{ marginTop: '20px' }}>
            <h4>Torus Specific Info (Scroll to check actions output in console box below)</h4>
            <button onClick={toggleTorusWidget}>Show/Hide Torus Button</button>
            <button onClick={getUserInfo}>Get User Info</button>
            <button onClick={createPaymentTx}>Create Payment Tx</button>
            <button onClick={changeProvider}>Change Provider</button>
            <div style={{ marginTop: '20px' }}>
              <select defaultValue="google" name="verifier" value={selectedVerifier} onChange={(e) => onSelectedVerifierChanged(e)}>
                <option value="google">Google</option>
                <option value="reddit">Reddit</option>
                <option value="discord">Discord</option>
              </select>
              <input
                style={{ marginLeft: '20px' }}
                value={verifierId}
                placeholder={placeholder}
                onChange={(e) => {
                  setVerifierId(e.target.value)
                }}
              />
            </div>
            <button disabled={!verifierId} style={{ marginTop: '20px' }} onClick={getPublicAddress}>Get Public Address</button>
          </section>

          <section style={{ marginTop: '20px' }}>
            <h4>Blockchain Apis</h4>
            <section>
              <h5>Signing</h5>
              <button onClick={signMessageWithoutPopup}>sign_eth_no_popup</button>
              <button onClick={signPersonalMsg}>personal_sign</button>
              <button onClick={signMessage}>sign_eth</button>
              <button onClick={signTypedDataV1}>sign typed data v1</button>
              <button onClick={signTypedDataV3}>sign typed data v3</button>
              <button onClick={signTypedDataV4}>sign typed data v4</button>
            </section>
            <section>
              <h5>Transactions</h5>
              <button onClick={sendEth}>Send Eth</button>
              <button onClick={sendDai}>Send DAI</button>
              <button onClick={approveKnc}>Approve Knc</button>
            </section>
            <section>
              <h5>Encrypt / Decrypt</h5>
              <button onClick={getEncryptionKey}>Get Encryption Key</button>
              <div>
                <input
                  style={{ marginLeft: '20px' }}
                  value={messageToEncrypt}
                  placeholder="Message to encrypt"
                  onChange={(e) => setMessageToEncrypt(e.target.value)}
                />
                <button disabled={!encryptionKey} onClick={encryptMessage}>Encrypt</button>
              </div>
              <button disabled={!messageEncrypted} onClick={decryptMessage}>Decrypt</button>
            </section>
          </section>
        </section>
        )
        }

      </div>
      {
        publicAddress

      && (
      <div id="console" style={{ whiteSpace: 'pre-line' }}>
        <p style={{ whiteSpace: 'pre-line' }} />
      </div>
      )
}
    </div>
  );
}
