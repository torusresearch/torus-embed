import React from 'react'
import web3Obj from './helper'

const tokenAbi = require('human-standard-token-abi')

class App extends React.Component {
  state = {
    account: null,
    balance: '',
    selectedVerifier: 'google',
    placeholder: 'Enter google email',
    verifierId: null,
    buildEnv: 'testing'
  }

  componentDidMount() {
    const isTorus = sessionStorage.getItem('pageUsingTorus')
    if (isTorus) {
      web3Obj.initialize().then(() => {
        this.setStateInfo()
      })
    }
  }

  setStateInfo = () => {
    web3Obj.web3.eth.getAccounts().then(accounts => {
      this.setState({ account: accounts[0] })
      web3Obj.web3.eth.getBalance(accounts[0]).then(balance => {
        this.setState({ balance: balance })
      })
    })
  }

  enableTorus = async e => {
    e.preventDefault()
    try {
      await web3Obj.initialize()
      this.setStateInfo()
    } catch (error) {
      console.error(error)
    }
  }

  changeProvider = async () => {
    await web3Obj.torus.setProvider({ host: 'ropsten' })
    this.console('finished changing provider')
  }

  getUserInfo = async () => {
    const userInfo = await web3Obj.torus.getUserInfo()
    this.console(userInfo)
  }

  logout = () => {
    web3Obj.torus.cleanUp().then(() => this.setState({ account: '', balance: 0 }))
  }

  signMessage = () => {
    // hex message
    const message = '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad'
    web3Obj.torus.web3.currentProvider.send(
      {
        method: 'eth_sign',
        params: [web3Obj.torus.web3.eth.accounts[0], message],
        from: web3Obj.torus.web3.eth.accounts[0]
      },
      (err, result) => {
        if (err) {
          return console.error(err)
        }
        this.console('sign message => true \n', result)
      }
    )
  }

  signTypedData_v1 = () => {
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
    web3Obj.torus.web3.currentProvider.send(
      {
        method: 'eth_signTypedData',
        params: [typedData, web3Obj.torus.web3.eth.accounts[0]],
        from: web3Obj.torus.web3.eth.accounts[0]
      },
      (err, result) => {
        if (err) {
          return console.error(err)
        }
        this.console('sign typed message v1 => true \n', result)
      }
    )
  }

  signTypedData_v3 = () => {
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' }
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' }
        ]
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
    web3Obj.torus.web3.currentProvider.send(
      {
        method: 'eth_signTypedData_v3',
        params: [web3Obj.torus.web3.eth.accounts[0], JSON.stringify(typedData)],
        from: web3Obj.torus.web3.eth.accounts[0]
      },
      (err, result) => {
        if (err) {
          return console.error(err)
        }
        this.console('sign typed message v3 => true \n', result)
      }
    )
  }

  console = text => {
    document.querySelector('#console>p').innerHTML = typeof text === 'object' ? JSON.stringify(text) : text
  }

  signTypedData_v4() {
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallets', type: 'address[]' }
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person[]' },
          { name: 'contents', type: 'string' }
        ],
        Group: [
          { name: 'name', type: 'string' },
          { name: 'members', type: 'Person[]' }
        ]
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
    web3Obj.torus.web3.currentProvider.send(
      {
        method: 'eth_signTypedData_v4',
        params: [web3Obj.torus.web3.eth.accounts[0], JSON.stringify(typedData)],
        from: web3Obj.torus.web3.eth.accounts[0]
      },
      (err, result) => {
        if (err) {
          return console.error(err)
        }
        this.console('sign typed message v4 => true \n', result)
      }
    )
  }

  sendEth = () => {
    const { account } = this.state
    web3Obj.web3.eth.sendTransaction({ from: account, to: account, value: web3Obj.web3.utils.toWei('0.01') })
  }

  sendDai = () => {
    web3Obj.torus.setProvider({ host: 'mainnet' }).finally(() => {
      const localWeb3 = web3Obj.web3
      const instance = new localWeb3.eth.Contract(tokenAbi, '0x6b175474e89094c44da98b954eedeac495271d0f')
      const value = Math.floor(parseFloat(0.01) * 10 ** parseFloat(18)).toString()
      instance.methods.transfer(this.state.account, value).send(
        {
          from: this.state.account
        },
        (err, hash) => {
          if (err) this.console(err)
          this.console(hash)
        }
      )
    })
  }

  createPaymentTx = () => {
    web3Obj.torus
      .initiateTopup('moonpay', {
        selectedCurrency: 'USD'
      })
      .finally(this.console)
  }

  getPublicAddress = () => {
    web3Obj.torus.getPublicAddress({ verifier: this.state.selectedVerifier, verifierId: this.state.verifierId }).then(this.console)
  }

  onSelectedVerifierChanged = event => {
    let placeholder = 'Enter google email'
    switch (event.target.value) {
      case 'google':
        placeholder = 'Enter google email'
        break
      case 'reddit':
        placeholder = 'Enter reddit username'
        break
      case 'discord':
        placeholder = 'Enter discord ID'
        break
      default:
        placeholder = 'Enter google email'
        break
    }
    this.setState({
      selectedVerifier: event.target.value,
      placeholder
    })
  }

  render() {
    let { account, buildEnv, selectedVerifier, verifierId, placeholder, balance } = this.state
    return (
      <div className="App">
        {!account && (
          <form onSubmit={this.enableTorus}>
            <p>Build Environment</p>
            <select name="buildEnv" value={buildEnv} onChange={e => this.setState({ buildEnv: e.target.value })}>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="testing">Testing</option>
              <option value="development">Development</option>
            </select>
            <button>Login</button>
          </form>
        )}
        {account !== null && (
          <div>
            <div>Account: {account}</div>
            <div>Balance: {balance}</div>
            <button onClick={this.getUserInfo}>Get User Info</button>
            <button onClick={this.createPaymentTx}>Create Payment Tx</button>
            <button onClick={this.sendEth}>Send Eth</button>
            <button onClick={this.logout}>Logout</button>
            <br />
            <button onClick={this.signMessage}>sign_eth</button>
            <button onClick={this.signTypedData_v1}>sign typed data v1</button>
            <button onClick={this.signTypedData_v3}>sign typed data v3</button>
            <button onClick={this.signTypedData_v4}>sign typed data v4</button>
            <button onClick={this.changeProvider}>Change Provider</button>
            <button onClick={this.sendDai}>Send DAI</button>
            <div style={{ marginTop: '20px' }}>
              <select name="verifier" onChange={this.onSelectedVerifierChanged} value={selectedVerifier}>
                <option defaultValue value="google">
                  Google
                </option>
                <option value="reddit">Reddit</option>
                <option value="discord">Discord</option>
              </select>
              <input
                type="email"
                style={{ marginLeft: '20px' }}
                onChange={e => this.setState({ verifierId: e.target.value })}
                placeholder={placeholder}
              />
            </div>
            <button disabled={!verifierId} style={{ marginTop: '20px' }} onClick={this.getPublicAddress}>
              Get Public Address
            </button>
          </div>
        )}
        <div id="console">
          <p></p>
        </div>
      </div>
    )
  }
}

export default App
