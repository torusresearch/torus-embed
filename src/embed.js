// Torus loading message
// const Web3 = require('web3')
import sriToolbox from 'sri-toolbox'
import log from 'loglevel'
import LocalMessageDuplexStream from 'post-message-stream'
import MetamaskInpageProvider from './inpage-provider.js'
import { setupMultiplex } from './stream-utils.js'
import { runOnLoad, htmlToElement, transformEthAddress } from './embedUtils.js'
import { post, generateJsonRPCObject, getLookupPromise } from './utils/httpHelpers.js'
import configuration from './config.js'
import Web3 from 'web3'

cleanContextForImports()

// eslint-disable-next-line no-unused-vars
// window.Web3 = Web3

const iframeIntegrity = 'sha384-//xcFLc4lT80ef8s37hakGrXi7Duqcvkmny9o4IcV+HNwKsvMgagS4sIoB1ybZ24'

restoreContextAfterImports()

class Torus {
  constructor(stylePosition = 'bottom-left', ...args) {
    this.stylePosition = stylePosition
    this.torusWidget = {}
    this.torusMenuBtn = {}
    this.torusLogin = {}
    this.torusIframe = {}
  }

  init(buildEnv = 'production') {
    return new Promise((resolve, reject) => {
      let torusUrl
      let logLevel
      switch (buildEnv) {
        case 'staging':
          torusUrl = 'https://staging.tor.us/v0.0.17'
          logLevel = 'info'
          break
        case 'testing':
          torusUrl = 'https://testing.tor.us'
          logLevel = 'debug'
          break
        case 'development':
          torusUrl = 'https://localhost:3000'
          logLevel = 'debug'
          break
        default:
          torusUrl = 'https://app.tor.us/v0.0.17'
          logLevel = 'error'
          break
      }
      log.setDefaultLevel(logLevel)
      this.createWidget(torusUrl)
      if (buildEnv !== 'staging' && buildEnv !== 'development') {
        // hacky solution to check for iframe integrity
        const fetchUrl = torusUrl + '/index.html'
        global.window
          .fetch(fetchUrl)
          .then(resp => resp.text())
          .then(response => {
            const integrity = sriToolbox.generate(
              {
                algorithms: ['sha384']
              },
              response
            )
            log.info(integrity, 'integrity')
            if (integrity === iframeIntegrity) {
              runOnLoad(this.setupWeb3.bind(this))
              resolve()
            } else {
              this.torusLogin.style.display = 'none'
              this.torusMenuBtn.style.display = 'none'
              reject(new Error('Integrity check failed'))
            }
          })
      } else {
        runOnLoad(this.setupWeb3.bind(this))
        resolve()
      }
    })
  }

  /**
   * Create widget
   */
  createWidget(torusUrl) {
    var link = window.document.createElement('link')
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('type', 'text/css')
    link.setAttribute('href', torusUrl + '/css/widget.css')
    // Login button code
    this.torusWidget = htmlToElement('<div id="torusWidget" class="widget"></div>')
    this.torusLogin = htmlToElement('<button id="torusLogin" />')
    this.torusWidget.appendChild(this.torusLogin)
    this.torusMenuBtn = htmlToElement('<button id="torusMenuBtn" />')
    this.torusWidget.appendChild(this.torusMenuBtn)

    // Iframe code
    this.torusIframe = htmlToElement('<iframe id="torusIframe" frameBorder="0" src="' + torusUrl + '/popup"></iframe>')
    // Setup on load code
    const bindOnLoad = () => {
      this.torusLogin.addEventListener('click', () => {
        this.login(false)
      })
      this.torusMenuBtn.addEventListener('click', () => {
        this.showWallet(true)
      })
    }

    const attachOnLoad = () => {
      window.document.head.appendChild(link)
      window.document.body.appendChild(this.torusIframe)
      window.document.body.appendChild(this.torusWidget)
    }

    runOnLoad(attachOnLoad.bind(this))
    runOnLoad(bindOnLoad.bind(this))

    log.info('STYLE POSITION: ' + this.stylePosition)
    switch (this.stylePosition) {
      case 'top-left':
        this.torusWidget.style.top = '8px'
        this.torusWidget.style.left = '8px'
        break
      case 'top-right':
        this.torusWidget.style.top = '8px'
        this.torusWidget.style.right = '8px'
        break
      case 'bottom-right':
        this.torusWidget.style.bottom = '8px'
        this.torusWidget.style.right = '8px'
        break
      case 'bottom-left':
      default:
        this.torusWidget.style.bottom = '8px'
        this.torusWidget.style.left = '8px'
        break
    }
  }

  showTorusButton() {
    // torusIframeContainer.style.display = 'none'
    this.torusMenuBtn.style.display = 'block'
    this.torusLogin.style.display = 'none'
  }

  hideTorusButton() {
    this.torusLogin.style.display = 'block'
    this.torusMenuBtn.style.display = 'none'
  }

  setupWeb3() {
    log.info('setupWeb3 running')
    // setup background connection
    this.metamaskStream = new LocalMessageDuplexStream({
      name: 'embed_metamask',
      target: 'iframe_metamask',
      targetWindow: this.torusIframe.contentWindow
    })
    this.metamaskStream.setMaxListeners(100)

    // Due to compatibility reasons, we should not set up multiplexing on window.metamaskstream
    // because the MetamaskInpageProvider also attempts to do so.
    // We create another LocalMessageDuplexStream for communication between dapp <> iframe
    this.communicationStream = new LocalMessageDuplexStream({
      name: 'embed_comm',
      target: 'iframe_comm',
      targetWindow: this.torusIframe.contentWindow
    })
    this.communicationStream.setMaxListeners(100)

    // Backward compatibility with Gotchi :)
    window.metamaskStream = this.communicationStream

    // compose the inpage provider
    const inpageProvider = new MetamaskInpageProvider(this.metamaskStream, {
      ethereum: this.ethereum,
      web3: this.web3
    })

    // detect eth_requestAccounts and pipe to enable for now
    const detectAccountRequestPrototypeModifier = m => {
      const originalMethod = inpageProvider[m]
      inpageProvider[m] = function({ method }) {
        if (method === 'eth_requestAccounts') {
          return this.ethereum.enable()
        }
        return originalMethod.apply(this, arguments)
      }.bind(this)
    }

    detectAccountRequestPrototypeModifier('send')
    detectAccountRequestPrototypeModifier('sendAsync')

    inpageProvider.setMaxListeners(100)
    inpageProvider.enable = () => {
      return new Promise((resolve, reject) => {
        // TODO: Handle errors when pipe is broken (eg. popup window is closed)

        // If user is already logged in, we assume they have given access to the website
        this.web3.eth.getAccounts((err, res) => {
          if (err) {
            setTimeout(function() {
              reject(err)
            }, 50)
          } else if (Array.isArray(res) && res.length > 0) {
            setTimeout(function() {
              resolve(res)
            }, 50)
          } else {
            // set up listener for login
            var oauthStream = this.communicationMux.getStream('oauth')
            var handler = function(data) {
              var { err, selectedAddress } = data
              if (err) {
                reject(err)
              } else {
                // returns an array (cause accounts expects it)
                resolve([transformEthAddress(selectedAddress)])
              }
              oauthStream.removeListener('data', handler)
            }
            oauthStream.on('data', handler)
            this.login(true)
          }
        })
      })
    }

    // Work around for web3@1.0 deleting the bound `sendAsync` but not the unbound
    // `sendAsync` method on the prototype, causing `this` reference issues with drizzle
    const proxiedInpageProvider = new Proxy(inpageProvider, {
      // straight up lie that we deleted the property so that it doesnt
      // throw an error in strict mode
      deleteProperty: () => true
    })

    this.ethereum = proxiedInpageProvider
    var communicationMux = setupMultiplex(this.communicationStream)
    this.communicationMux = communicationMux

    // Show torus button if wallet has been hydrated/detected
    var statusStream = communicationMux.getStream('status')
    statusStream.on('data', status => {
      log.info('data received on statusStream')
      log.info(status)
      if (status.loggedIn) this.showTorusButton()
      else if (status.loggedIn === false) this.hideTorusButton()
    })
    // if (typeof window.web3 !== 'undefined') {
    //   console.log(`Torus detected another web3.
    // Torus will not work reliably with another web3 extension.
    // This usually happens if you have two Torus' installed,
    // or Torus and another web3 extension. Please remove one
    // and try again.`)
    // }

    this.provider = inpageProvider

    this.web3 = new Web3(inpageProvider)
    this.web3.setProvider = function() {
      log.debug('Torus - overrode web3.setProvider')
    }
    // pretend to be Metamask for dapp compatibility reasons
    this.web3.currentProvider.isMetamask = true
    this.web3.currentProvider.isTorus = true
    // window.web3 = window.torus.web3
    log.debug('Torus - injected web3')
  }

  // Exposing login function, if called from embed, flag as true
  login(calledFromEmbed) {
    var oauthStream = this.communicationMux.getStream('oauth')
    oauthStream.write({ name: 'oauth', data: { calledFromEmbed } })
  }

  setProvider(network, type) {
    var providerChangeStream = this.communicationMux.getStream('provider_change')
    if (type === 'rpc' && !Object.prototype.hasOwnProperty.call(network, 'networkUrl'))
      throw new Error('if provider is rpc, a json object {networkUrl, chainId, networkName} is expected as network')
    log.info('trying to change provider to', network)
    providerChangeStream.write({ name: 'provider_change', data: { network, type } })
  }

  showWallet(calledFromEmbed) {
    var showWalletStream = this.communicationMux.getStream('show_wallet')
    showWalletStream.write({ name: 'show_wallet', data: { calledFromEmbed } })
  }

  /**
   * Expose the getPublicKey API to the Dapp through window.torus object
   * @param {String} email Email address of the user
   */
  getPublicAddress(email) {
    // Select random node from the list of endpoints
    const randomNumber = Math.floor(Math.random() * configuration.torusNodeEndpoints.length)
    const node = configuration.torusNodeEndpoints[randomNumber]

    return new Promise((resolve, reject) => {
      post(
        node,
        generateJsonRPCObject('VerifierLookupRequest', {
          verifier: 'google',
          verifier_id: email
        })
      )
        .catch(err => console.error(err))
        .then(lookupShare => {
          if (lookupShare.error) {
            return post(
              node,
              generateJsonRPCObject('KeyAssign', {
                verifier: 'google',
                verifier_id: email
              })
            )
          } else if (lookupShare.result) {
            return getLookupPromise(lookupShare)
          }
        })
        .catch(err => console.error(err))
        .then(lookupShare => {
          log.info('completed')
          log.info(lookupShare)
          var ethAddress = lookupShare.result.keys[0].address
          log.info(ethAddress)
          resolve(ethAddress)
        })
        .catch(err => {
          console.error(err)
          reject(err)
        })
    })
  }
}

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
var __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports() {
  __define = global.define
  try {
    global.define = undefined
  } catch (_) {
    log.warn('MetaMask - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports() {
  try {
    global.define = __define
  } catch (_) {
    log.warn('MetaMask - global.define could not be overwritten.')
  }
}

export default Torus
