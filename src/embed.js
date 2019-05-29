// Torus loading message
console.log('TORUS INJECTED IN', window.location.href)

let torusUrl
let logLevel

/* global Web3 */
if (process.env.NODE_ENV === 'production') {
  require('./vendor/web3.min.js')
  torusUrl = 'https://app.tor.us'
  logLevel = 'error'
} else if (process.env.NODE_ENV === 'staging') {
  require('./vendor/web3.min.js')
  torusUrl = 'https://staging.tor.us'
  logLevel = 'info'
} else if (process.env.NODE_ENV === 'development') {
  require('./vendor/web3.js')
  torusUrl = 'https://localhost:3000'
  logLevel = 'debug'
}

if (window.torus === undefined) {
  window.torus = {}
}
cleanContextForImports()
const log = require('loglevel')
log.setDefaultLevel(logLevel)
const LocalMessageDuplexStream = require('post-message-stream')
const MetamaskInpageProvider = require('./inpage-provider.js')
const setupMultiplex = require('./stream-utils.js').setupMultiplex
const embedUtils = require('./embedUtils.js')
// const styleColor = document.currentScript.getAttribute('style-color')
let stylePosition = ''
if (window.document.currentScript) {
  stylePosition = window.document.currentScript.getAttribute('style-position')
}

var torusWidget, torusMenuBtn, torusLogin, torusIframe

restoreContextAfterImports()
createWidget()
embedUtils.runOnLoad(setupWeb3)

/**
 * Create widget
 */
function createWidget() {
  log.info('Creating Torus widget...')
  var link = window.document.createElement('link')
  link.setAttribute('rel', 'stylesheet')
  link.setAttribute('type', 'text/css')
  link.setAttribute('href', torusUrl + '/css/widget.css')
  // Login button code
  torusWidget = embedUtils.htmlToElement('<div id="torusWidget" class="widget"></div>')
  torusLogin = embedUtils.htmlToElement('<button id="torusLogin" />')
  torusWidget.appendChild(torusLogin)
  torusMenuBtn = embedUtils.htmlToElement('<button id="torusMenuBtn" />')
  torusWidget.appendChild(torusMenuBtn)

  // Iframe code
  torusIframe = embedUtils.htmlToElement('<iframe id="torusIframe" frameBorder="0" src="' + torusUrl + '/popup"></iframe>')

  // Setup on load code
  var bindOnLoad = function() {
    torusLogin.addEventListener('click', function() {
      window.torus.login(false)
    })
    torusMenuBtn.addEventListener('click', function() {
      window.torus.showWallet(true)
    })
  }
  var attachOnLoad = function() {
    window.document.head.appendChild(link)
    window.document.body.appendChild(torusIframe)
    window.document.body.appendChild(torusWidget)
  }
  embedUtils.runOnLoad(attachOnLoad)
  embedUtils.runOnLoad(bindOnLoad)

  log.info('STYLE POSITION: ' + stylePosition)
  switch (stylePosition) {
    case 'top-left':
      torusWidget.style.top = '8px'
      torusWidget.style.left = '8px'
      break
    case 'top-right':
      torusWidget.style.top = '8px'
      torusWidget.style.right = '8px'
      break
    case 'bottom-right':
      torusWidget.style.bottom = '8px'
      torusWidget.style.right = '8px'
      break
    case 'bottom-left':
      torusWidget.style.bottom = '8px'
      torusWidget.style.left = '8px'
      break
    default:
      torusWidget.style.bottom = '8px'
      torusWidget.style.left = '8px'
  }
}

function showTorusButton() {
  // torusIframeContainer.style.display = 'none'
  torusMenuBtn.style.display = 'block'
  torusLogin.style.display = 'none'
}

function hideTorusButton() {
  torusLogin.style.display = 'block'
  torusMenuBtn.style.display = 'none'
}

function setupWeb3() {
  log.info('setupWeb3 running')
  // setup background connection
  window.torus.metamaskStream = new LocalMessageDuplexStream({
    name: 'embed_metamask',
    target: 'iframe_metamask',
    targetWindow: torusIframe.contentWindow
  })
  window.torus.metamaskStream.setMaxListeners(100)

  // Due to compatibility reasons, we should not set up multiplexing on window.metamaskstream
  // because the MetamaskInpageProvider also attempts to do so.
  // We create another LocalMessageDuplexStream for communication between dapp <> iframe
  window.torus.communicationStream = new LocalMessageDuplexStream({
    name: 'embed_comm',
    target: 'iframe_comm',
    targetWindow: torusIframe.contentWindow
  })
  window.torus.communicationStream.setMaxListeners(100)

  // Backward compatibility with Gotchi :)
  window.metamaskStream = window.torus.communicationStream

  // compose the inpage provider
  var inpageProvider = new MetamaskInpageProvider(window.torus.metamaskStream)

  // detect eth_requestAccounts and pipe to enable for now
  function detectAccountRequestPrototypeModifier(m) {
    const originalMethod = inpageProvider[m]
    inpageProvider[m] = function({ method }) {
      if (method === 'eth_requestAccounts') {
        return window.ethereum.enable()
      }
      return originalMethod.apply(this, arguments)
    }
  }
  detectAccountRequestPrototypeModifier('send')
  detectAccountRequestPrototypeModifier('sendAsync')

  inpageProvider.setMaxListeners(100)
  inpageProvider.enable = function() {
    return new Promise((resolve, reject) => {
      // TODO: Handle errors when pipe is broken (eg. popup window is closed)

      // If user is already logged in, we assume they have given access to the website
      window.web3.eth.getAccounts(function(err, res) {
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
          var oauthStream = window.torus.communicationMux.getStream('oauth')
          var handler = function(data) {
            var { err, selectedAddress } = data
            if (err) {
              reject(err)
            } else {
              // returns an array (cause accounts expects it)
              resolve([embedUtils.transformEthAddress(selectedAddress)])
            }
            oauthStream.removeListener('data', handler)
          }
          oauthStream.on('data', handler)
          window.torus.login(true)
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

  window.ethereum = proxiedInpageProvider
  var communicationMux = setupMultiplex(window.torus.communicationStream)
  window.torus.communicationMux = communicationMux

  // window.addEventListener('message', message => {
  //   if (message.data === 'showTorusIframe') {
  //     showTorusOverlay()
  //   } else if (message.data === 'hideTorusIframe') {
  //     hideTorusOverlay()
  //   }
  // })

  // TODO: check if unused
  // function showTorusOverlay() {
  //   window.document.getElementById('torusLogin').style.display = 'none'
  // }

  // function hideTorusOverlay() {
  //   window.document.getElementById('torusLogin').style.display = 'block'
  // }

  // var displayStream = communicationMux.getStream('display')
  // displayStream.on('data', function(msg) {
  //   if (msg === 'close') {
  //     showTorusButton()
  //   } else if (msg === 'open') {
  //     showTorusOverlay()
  //   }
  // })
  // TODO: end check if unused

  // Show torus button if wallet has been hydrated/detected
  var statusStream = window.torus.communicationMux.getStream('status')
  statusStream.on('data', function(status) {
    log.info('data received on statusStream')
    log.info(status)
    if (status.loggedIn) showTorusButton()
    else if (status.loggedIn === false) hideTorusButton()
  })

  // Exposing login function, if called from embed, flag as true
  window.torus.login = function(calledFromEmbed) {
    var oauthStream = window.torus.communicationMux.getStream('oauth')
    oauthStream.write({ name: 'oauth', data: { calledFromEmbed } })
  }

  // window.torus.changeNetwork = function(network) {
  //   var networkStream = window.torus.communicationMux.getStream('network_change')
  //   networkStream.write({ name: 'network_change', data: { network } })
  // }

  window.torus.showWallet = function(calledFromEmbed) {
    var showWalletStream = window.torus.communicationMux.getStream('show_wallet')
    showWalletStream.write({ name: 'show_wallet', data: { calledFromEmbed } })
  }

  if (typeof window.web3 !== 'undefined') {
    throw new Error(`Torus detected another web3.
      Torus will not work reliably with another web3 extension.
      This usually happens if you have two Torus' installed,
      or Torus and another web3 extension. Please remove one
      and try again.`)
  }

  window.torus.web3 = new window.Web3(inpageProvider)
  window.torus.web3.setProvider = function() {
    log.debug('Torus - overrode web3.setProvider')
  }
  // pretend to be Metamask for dapp compatibility reasons
  window.torus.web3.currentProvider.isMetamask = true
  window.torus.web3.currentProvider.isTorus = true
  window.web3 = window.torus.web3
  log.debug('Torus - injected web3')
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
