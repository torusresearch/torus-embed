import NodeDetailManager from '@toruslabs/fetch-node-details'
import TorusJs from '@toruslabs/torus.js'
import log from 'loglevel'
import LocalMessageDuplexStream from 'post-message-stream'
import Web3 from 'web3'

import { version } from '../package.json'
import configuration from './config'
import { handleEvent, handleStream, htmlToElement, runOnLoad, transformEthAddress } from './embedUtils'
import MetamaskInpageProvider from './inpage-provider'
import generateIntegrity from './integrity'
import PopupHandler from './PopupHandler'
import { sendSiteMetadata } from './siteMetadata'
import { setupMultiplex } from './stream-utils'
import { getPreopenInstanceId, getTorusUrl, validatePaymentProvider } from './utils'

const { GOOGLE, FACEBOOK, REDDIT, TWITCH, DISCORD } = configuration.enums
const defaultVerifiers = {
  [GOOGLE]: true,
  [FACEBOOK]: true,
  [REDDIT]: true,
  [TWITCH]: true,
  [DISCORD]: true,
}

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
let __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports() {
  try {
    __define = global.define
    global.define = undefined
  } catch (_) {
    log.warn('Torus - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports() {
  try {
    global.define = __define
  } catch (_) {
    log.warn('Torus - global.define could not be overwritten.')
  }
}

cleanContextForImports()

const iframeIntegrity = 'sha384-XxIIw1IA/uFJDm/fGc0OZNPFJlMLkSow/wq4inV1+q2RUiTp7CeVMJS+6EkZ51rq'
const expectedCacheControlHeader = 'max-age=3600'

restoreContextAfterImports()

let thirdPartyCookiesSupported = true
const receiveMessage = (evt) => {
  if (evt.data === 'torus:3PCunsupported') {
    log.info('unsupported 3rd party cookies')
    thirdPartyCookiesSupported = false
    window.removeEventListener('message', receiveMessage)
  } else if (evt.data === 'torus:3PCsupported') {
    log.info('supported 3rd party cookies')
    thirdPartyCookiesSupported = true
    window.removeEventListener('message', receiveMessage)
  }
}
window.addEventListener('message', receiveMessage, false)

class Torus {
  constructor({ buttonPosition = 'bottom-left' } = {}) {
    this.buttonPosition = buttonPosition
    this.torusWidget = {}
    this.torusMenuBtn = {}
    this.torusLogin = {}
    this.torusLoadingBtn = {}
    this.torusUrl = ''
    this.torusIframe = {}
    this.torusLoginModal = {}
    this.torusSpeedDial = {}
    this.keyBtn = {}
    this.styleLink = {}
    this.isLoggedIn = false // ethereum.enable working
    this.isInitalized = false // init done
    this.torusButtonVisibility = true
    this.requestedVerifier = ''
    this.currentVerifier = ''
    this.enabledVerifiers = {}
    this.Web3 = Web3
    this.torusAlert = {}
    this.nodeDetailManager = new NodeDetailManager()
    this.torusJs = new TorusJs()
    this.whiteLabel = {}
  }

  async init({
    buildEnv = 'production',
    enableLogging = false,
    enabledVerifiers = defaultVerifiers,
    network = {
      host: 'mainnet',
      chainId: 1,
      networkName: 'mainnet',
    },
    showTorusButton = true,
    integrity = {
      check: false,
      hash: iframeIntegrity,
      version,
    },
    whiteLabel = {},
  } = {}) {
    if (this.isInitalized) return Promise.reject(new Error('Already initialized'))
    const { torusUrl, logLevel } = await getTorusUrl(buildEnv, integrity)
    log.info(torusUrl, 'url loaded')
    this.torusUrl = torusUrl
    this.enabledVerifiers = { ...defaultVerifiers, ...enabledVerifiers }
    this.whiteLabel = whiteLabel
    log.setDefaultLevel(logLevel)
    if (enableLogging) log.enableAll()
    else log.disableAll()
    this.torusButtonVisibility = showTorusButton
    this._createWidget(torusUrl)
    const attachIFrame = () => {
      window.document.body.appendChild(this.torusIframe)
    }
    const handleSetup = async () => {
      await runOnLoad(attachIFrame)
      await runOnLoad(this._setupWeb3.bind(this))
      await runOnLoad(async () => {
        const initStream = this.communicationMux.getStream('init_stream')
        initStream.write({ name: 'init_stream', data: { enabledVerifiers: this.enabledVerifiers, whiteLabel: this.whiteLabel } })

        await this._setProvider(network)
        this.isInitalized = true
      })
    }
    if (buildEnv === 'production' && integrity.check) {
      // hacky solution to check for iframe integrity
      const fetchUrl = `${torusUrl}/popup`
      const resp = await fetch(fetchUrl, { cache: 'reload' })
      if (resp.headers.get('Cache-Control') !== expectedCacheControlHeader) {
        throw new Error(`Unexpected Cache-Control headers, got ${resp.headers.get('Cache-Control')}`)
      }
      const response = await resp.text()
      const calculatedIntegrity = generateIntegrity(
        {
          algorithms: ['sha384'],
        },
        response
      )
      log.info(calculatedIntegrity, 'integrity')
      if (calculatedIntegrity === integrity.hash) {
        await handleSetup()
      } else {
        this._cleanUp()
        throw new Error('Integrity check failed')
      }
    } else {
      await handleSetup()
    }
    return undefined
  }

  _checkThirdPartyCookies() {
    if (!thirdPartyCookiesSupported) {
      this._createAlert(
        '<div id="torusAlert" class="torus-alert">' +
          '<h1>Cookies Required</h1>' +
          '<p>Please enable cookies in your browser preferences to access Torus.</p>' +
          '<p>For more info, <a href="https://docs.tor.us/faq/users#cookies" target="_blank" rel="noreferrer noopener">click here</a></p>' +
          '</div>'
      )
      throw new Error('Third party cookies not supported')
    }
  }

  /**
   * Logs the user in
   */
  login({ verifier } = {}) {
    if (!this.isInitalized) throw new Error('Call init() first')
    if (verifier && !this.enabledVerifiers[verifier]) throw new Error('Given verifier is not enabled')
    if (!verifier) {
      this.requestedVerifier = ''
      return this.ethereum.enable()
    }
    if (configuration.verifierList.includes(verifier)) {
      this.requestedVerifier = verifier
      return this.ethereum.enable()
    }
    throw new Error('Unsupported verifier')
  }

  /**
   * Logs the user out
   */
  logout() {
    return new Promise((resolve, reject) => {
      if (!this.isLoggedIn) {
        reject(new Error('User has not logged in yet'))
        return
      }

      const logOutStream = this.communicationMux.getStream('logout')
      logOutStream.write({ name: 'logOut' })
      const statusStream = this.communicationMux.getStream('status')
      const statusStreamHandler = (status) => {
        if (!status.loggedIn) {
          this.isLoggedIn = false
          this.currentVerifier = ''
          this.requestedVerifier = ''
          resolve()
        } else reject(new Error('Some Error Occured'))
      }
      handleStream(statusStream, 'data', statusStreamHandler)
    })
  }

  /**
   * Logs the user out and then cleans up (removes iframe, widget, css)
   */
  async cleanUp() {
    if (this.isLoggedIn) {
      await this.logout()
    }
    this._cleanUp()
  }

  _cleanUp() {
    function isElement(element) {
      return element instanceof Element || element instanceof HTMLDocument
    }
    if (isElement(this.styleLink) && window.document.body.contains(this.styleLink)) {
      this.styleLink.remove()
      this.styleLink = {}
    }
    if (isElement(this.torusWidget) && window.document.body.contains(this.torusWidget)) {
      this.torusWidget.remove()
      this.torusWidget = {}
      this.torusLogin = {}
      this.torusMenuBtn = {}
      this.torusLoadingBtn = {}
      this.torusLoginModal = {}
    }
    if (isElement(this.torusIframe) && window.document.body.contains(this.torusIframe)) {
      this.torusIframe.remove()
      this.torusIframe = {}
    }
    if (isElement(this.torusAlert) && window.document.body.contains(this.torusAlert)) {
      this.torusAlert.remove()
      this.torusAlert = {}
    }
    this.isInitalized = false
  }

  /**
   * Show alert for Cookies Required
   */
  _createAlert(alertContent) {
    this.torusAlert = htmlToElement(alertContent)

    const closeAlert = htmlToElement('<span id="torusAlert__close">x<span>')
    this.torusAlert.appendChild(closeAlert)

    const bindOnLoad = () => {
      closeAlert.addEventListener('click', () => {
        this.torusAlert.remove()
      })
    }

    this.setEmbedWhiteLabel(this.torusAlert)

    const attachOnLoad = () => {
      window.document.body.appendChild(this.torusAlert)
    }

    runOnLoad(attachOnLoad)
    runOnLoad(bindOnLoad)
  }

  /**
   * Show alert for when popup is blocked
   */
  _createPopupBlockAlert(preopenInstanceId) {
    const torusAlert = htmlToElement(
      '<div id="torusAlert">' +
        '<h1 id="torusAlert__title">Action Required</h1>' +
        '<p id="torusAlert__desc">You have a pending action that needs to be completed in a pop-up window </p></div>'
    )

    const successAlert = htmlToElement('<div><button id="torusAlert__btn">Confirm</button></div>')
    torusAlert.appendChild(successAlert)
    const bindOnLoad = () => {
      successAlert.addEventListener('click', () => {
        this._handleWindow(preopenInstanceId, {
          target: '_blank',
          features: 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=660,width=500',
        })
        torusAlert.remove()
      })
    }

    this.setEmbedWhiteLabel(torusAlert)

    const attachOnLoad = () => {
      window.document.body.appendChild(torusAlert)
    }

    runOnLoad(attachOnLoad)
    runOnLoad(bindOnLoad)
  }

  /**
   * Creates the widget
   */
  _createWidget(torusUrl) {
    const link = window.document.createElement('link')

    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('type', 'text/css')
    link.setAttribute('href', `${torusUrl}/css/widget.css`)

    this.styleLink = link

    this.torusWidget = htmlToElement('<div id="torusWidget" class="widget"></div>')

    // Loading spinner
    const spinner = htmlToElement(
      '<div id="torusSpinner">' +
        '<div class="torusSpinner__beat beat-odd"></div>' +
        '<div class="torusSpinner__beat beat-even"></div>' +
        '<div class="torusSpinner__beat beat-odd"></div>' +
        '</div>'
    )
    this.torusLoadingBtn = htmlToElement('<button disabled class="torus-btn torus-btn--loading"></button>')
    if (!this.torusButtonVisibility) {
      this.torusLoadingBtn.style.display = 'none'
    }
    this.torusLoadingBtn.appendChild(spinner)
    this.torusWidget.appendChild(this.torusLoadingBtn)

    // Login button code
    this.torusLogin = htmlToElement('<button id="torusLogin" class="torus-btn torus-btn--login"></button>')
    if (!this.torusButtonVisibility) {
      this.torusLogin.style.display = 'none'
    }
    this.torusWidget.appendChild(this.torusLogin)

    // Menu button
    this.torusMenuBtn = htmlToElement('<button id="torusMenuBtn" class="torus-btn torus-btn--main" />')
    if (!this.torusButtonVisibility) {
      this.torusMenuBtn.style.display = 'none'
    }
    this.torusWidget.appendChild(this.torusMenuBtn)

    // Speed dial list
    this.torusSpeedDial = htmlToElement('<ul id="torusWidget__speed-dial-list" style="transition-delay: 0.05s;display: none">')
    this.torusSpeedDial.style.opacity = '0'
    const homeBtn = htmlToElement('<li><button class="torus-btn torus-btn--home" title="Wallet Home Page"></button></li>')

    const tooltipNote = htmlToElement('<div class="torus-tooltip-text torus-tooltip-note">Copy public address to clipboard</div>')
    const tooltipCopied = htmlToElement('<div class="torus-tooltip-text torus-tooltip-copied">Copied!</div>')
    this.keyBtn = htmlToElement('<button class="torus-btn torus-btn--text">0xe5..</button>')
    const keyContainer = htmlToElement('<li class="torus-tooltip"></li>')

    keyContainer.appendChild(this.keyBtn)
    keyContainer.appendChild(tooltipNote)
    keyContainer.appendChild(tooltipCopied)

    const transferBtn = htmlToElement('<li><button class="torus-btn torus-btn--transfer" title="Wallet Transfer Page"></button></li>')

    this.torusSpeedDial.appendChild(homeBtn)
    this.torusSpeedDial.appendChild(keyContainer)
    this.torusSpeedDial.appendChild(transferBtn)

    this.torusWidget.prepend(this.torusSpeedDial)

    // Multiple login modal
    this.torusLoginModal = htmlToElement('<div id="torus-login-modal"></div>')
    this.torusLoginModal.style.display = 'none'
    const modalContainer = htmlToElement(
      '<div id="torus-login-modal__modal-container">' +
        '<div id="torus-login-modal__close-container">' +
        '<span id="torus-login-modal__close">&times;</span>' +
        '</div>' +
        '</div>'
    )

    const modalContent = htmlToElement(
      `${'<div id="torus-login-modal__modal-content"><div id="torus-login-modal__header-container"><img src="'}` +
        `${torusUrl}/images/torus-logo-blue.svg` +
        '"><div id="torus-login-modal__login-header">Login</div></div>' +
        '</div>'
    )

    const formContainer = htmlToElement(
      '<div id="torus-login-modal__form-container">' +
        '<p id="torus-login-modal__login-subtitle">You are just one step away from your digital wallet</p>' +
        '</div>'
    )

    this.googleLogin = htmlToElement(
      `<button id="torus-login-modal__login-google"><img src="${torusUrl}/img/icons/google.svg">Sign in with Google</button>`
    )

    // List for other logins
    const loginList = htmlToElement('<ul id="torus-login-modal__login-list"></ul>')
    this.facebookLogin = htmlToElement(
      `${'<li><button id="torus-login-modal__login-btn--facebook" title="Login with Facebook"><img src="'}` +
        `${torusUrl}/img/icons/facebook.svg"></button></li>`
    )
    this.twitchLogin = htmlToElement(
      `<li><button id="torus-login-modal__login-btn--twitch" title="Login with Twitch"><img src="${torusUrl}/img/icons/twitch.svg` +
        '"></button></li>'
    )
    this.redditLogin = htmlToElement(
      `<li><button id="torus-login-modal__login-btn--reddit" title="Login with Reddit"><img src="${torusUrl}/img/icons/reddit.svg` +
        '"></button></li>'
    )
    this.discordLogin = htmlToElement(
      `${'<li><button id="torus-login-modal__login-btn--discord" title="Login with Discord"><img src="'}${torusUrl}/img/icons/discord.svg` +
        '"></button></li>'
    )

    if (this.enabledVerifiers[FACEBOOK]) loginList.appendChild(this.facebookLogin)
    if (this.enabledVerifiers[REDDIT]) loginList.appendChild(this.redditLogin)
    if (this.enabledVerifiers[TWITCH]) loginList.appendChild(this.twitchLogin)
    if (this.enabledVerifiers[DISCORD]) loginList.appendChild(this.discordLogin)

    if (this.enabledVerifiers[GOOGLE]) {
      formContainer.appendChild(this.googleLogin)
    }
    formContainer.appendChild(loginList)

    const loginNote = htmlToElement(
      '<div id="torus-login-modal__login-note">By logging in, you accept Torus\' ' +
        '<a href="https://docs.tor.us/legal/terms-and-conditions" target="_blank">Terms and Conditions</a></div>'
    )

    formContainer.appendChild(loginNote)
    modalContent.appendChild(formContainer)

    modalContainer.appendChild(modalContent)
    this.torusLoginModal.appendChild(modalContainer)

    // Append login codes to widget
    this.torusWidget.appendChild(this.torusLoginModal)

    // Set whitelabel
    this.setEmbedWhiteLabel(this.torusWidget)

    // Iframe code
    this.torusIframe = htmlToElement(`<iframe id="torusIframe" frameBorder="0" src="${torusUrl}/popup"></iframe>`)
    // Setup on load code
    const bindOnLoad = () => {
      this.torusLogin.addEventListener('click', () => {
        this._showLoginPopup(false)
      })

      homeBtn.addEventListener('click', () => {
        this.showWallet()
        this._toggleSpeedDial()
      })

      transferBtn.addEventListener('click', () => {
        this.showWallet('transfer')
        this._toggleSpeedDial()
      })

      this.keyBtn.addEventListener('click', () => {
        const publicKey = htmlToElement(`<input type="text" value="${this.ethereum.selectedAddress}">`)
        this.torusWidget.prepend(publicKey)
        publicKey.select()
        publicKey.setSelectionRange(0, 99999) // For mobile

        document.execCommand('copy')
        this.torusWidget.removeChild(publicKey)

        tooltipCopied.classList.add('active')
        tooltipNote.classList.add('active')

        setTimeout(() => {
          tooltipCopied.classList.remove('active')
          tooltipNote.classList.remove('active')
          this._toggleSpeedDial()
        }, 1000)
      })

      this.torusMenuBtn.addEventListener('click', () => {
        this._toggleSpeedDial()
      })

      // Login Modal Listeners
      modalContainer.querySelector('#torus-login-modal__close').addEventListener('click', () => {
        this.torusLoginModal.style.display = 'none'
        if (this.modalCloseHandler) this.modalCloseHandler()
        delete this.modalCloseHandler
      })
    }

    const attachOnLoad = () => {
      window.document.head.appendChild(link)
      window.document.body.appendChild(this.torusWidget)
    }

    runOnLoad(attachOnLoad)
    runOnLoad(bindOnLoad)

    switch (this.buttonPosition) {
      case 'top-left':
        this.torusWidget.style.top = '34px'
        this.torusWidget.style.left = '34px'
        break
      case 'top-right':
        this.torusWidget.style.top = '34px'
        this.torusWidget.style.right = '34px'
        break
      case 'bottom-right':
        this.torusWidget.style.bottom = '34px'
        this.torusWidget.style.right = '34px'
        break
      case 'bottom-left':
      default:
        this.torusWidget.style.bottom = '34px'
        this.torusWidget.style.left = '34px'
        break
    }
  }

  _updateKeyBtnAddress(selectedAddress) {
    this.keyBtn.innerText = selectedAddress && `${selectedAddress.slice(0, 4)}..`
  }

  _showLoggedOut() {
    this.torusMenuBtn.style.display = 'none'
    this.torusLogin.style.display = this.torusButtonVisibility ? 'block' : 'none'
    this.torusLoadingBtn.style.display = 'none'
    this.torusLoginModal.style.display = 'none'
    this.torusSpeedDial.style.display = 'none'
    this.torusSpeedDial.style.opacity = '0'
  }

  _showLoggingIn() {
    this.torusMenuBtn.style.display = 'none'
    this.torusLogin.style.display = 'none'
    this.torusLoadingBtn.style.display = this.torusButtonVisibility ? 'block' : 'none'
    this.torusLoginModal.style.display = this.requestedVerifier === '' ? 'block' : 'none'
  }

  _showLoggedIn() {
    this.torusMenuBtn.style.display = this.torusButtonVisibility ? 'block' : 'none'
    this.torusLogin.style.display = 'none'
    this.torusLoadingBtn.style.display = 'none'
    this.torusLoginModal.style.display = 'none'
  }

  /**
   * Hides the torus button in the dapp context
   */
  hideTorusButton() {
    this.torusButtonVisibility = false
    this.torusMenuBtn.style.display = 'none'
    this.torusLogin.style.display = 'none'
    this.torusLoadingBtn.style.display = 'none'
    this.torusSpeedDial.style.display = 'none'
    this.torusSpeedDial.style.opacity = '0'
  }

  /**
   * Shows the torus button in the dapp context.
   * If user is not logged in, it shows login btn. Else, it shows Torus logo btn
   */
  showTorusButton() {
    this.torusButtonVisibility = true
    if (this.isLoggedIn) this._showLoggedIn()
    else this._showLoggedOut()
  }

  _setupWeb3() {
    log.info('setupWeb3 running')
    // setup background connection
    this.metamaskStream = new LocalMessageDuplexStream({
      name: 'embed_metamask',
      target: 'iframe_metamask',
      targetWindow: this.torusIframe.contentWindow,
    })
    this.metamaskStream.setMaxListeners(100)

    // Due to compatibility reasons, we should not set up multiplexing on window.metamaskstream
    // because the MetamaskInpageProvider also attempts to do so.
    // We create another LocalMessageDuplexStream for communication between dapp <> iframe
    this.communicationStream = new LocalMessageDuplexStream({
      name: 'embed_comm',
      target: 'iframe_comm',
      targetWindow: this.torusIframe.contentWindow,
    })
    this.communicationStream.setMaxListeners(100)

    // Backward compatibility with Gotchi :)
    // window.metamaskStream = this.communicationStream

    // compose the inpage provider
    const inpageProvider = new MetamaskInpageProvider(this.metamaskStream)

    // detect eth_requestAccounts and pipe to enable for now
    const detectAccountRequestPrototypeModifier = (m) => {
      const originalMethod = inpageProvider[m]
      inpageProvider[m] = function providerFunc(method, ...args) {
        if (method && method === 'eth_requestAccounts') {
          return inpageProvider.enable()
        }
        return originalMethod.apply(this, [method, ...args])
      }
    }

    detectAccountRequestPrototypeModifier('send')
    detectAccountRequestPrototypeModifier('sendAsync')

    inpageProvider.setMaxListeners(100)
    inpageProvider.enable = () => {
      this._checkThirdPartyCookies()
      this._showLoggingIn()
      return new Promise((resolve, reject) => {
        // If user is already logged in, we assume they have given access to the website
        inpageProvider.sendAsync({ method: 'eth_requestAccounts', params: [] }, (err, { result: res } = {}) => {
          if (err) {
            setTimeout(() => {
              this._showLoggedOut()
              reject(err)
            }, 50)
          } else if (Array.isArray(res) && res.length > 0) {
            // If user is already rehydrated, resolve this
            // else wait for something to be written to status stream
            const handleLoginCb = () => {
              if (this.requestedVerifier !== '' && this.currentVerifier !== this.requestedVerifier) {
                const { requestedVerifier } = this
                // eslint-disable-next-line promise/no-promise-in-callback
                this.logout()
                  // eslint-disable-next-line promise/always-return
                  .then((_) => {
                    this.requestedVerifier = requestedVerifier
                    this._showLoginPopup(true, resolve, reject)
                  })
                  .catch((error) => reject(error))
              } else {
                this._showLoggedIn()
                resolve(res)
              }
            }
            if (this.isLoggedIn) {
              handleLoginCb()
            } else {
              this.isLoginCallback = handleLoginCb
            }
          } else {
            // set up listener for login
            this._showLoginPopup(true, resolve, reject)
          }
        })
      })
    }

    // Work around for web3@1.0 deleting the bound `sendAsync` but not the unbound
    // `sendAsync` method on the prototype, causing `this` reference issues with drizzle
    const proxiedInpageProvider = new Proxy(inpageProvider, {
      // straight up lie that we deleted the property so that it doesnt
      // throw an error in strict mode
      deleteProperty: () => true,
    })

    this.ethereum = proxiedInpageProvider
    const communicationMux = setupMultiplex(this.communicationStream)
    communicationMux.setMaxListeners(20)
    this.communicationMux = communicationMux

    const windowStream = communicationMux.getStream('window')
    windowStream.on('data', (chunk) => {
      if (chunk.name === 'create_window') {
        this._createPopupBlockAlert(chunk.data.preopenInstanceId)
      }
    })

    // Show torus button if wallet has been hydrated/detected
    const statusStream = communicationMux.getStream('status')
    statusStream.on('data', (status) => {
      // login
      if (status.loggedIn) {
        this.isLoggedIn = status.loggedIn
        this.currentVerifier = status.verifier
      } // logout
      else this._showLoggedOut()
      if (this.isLoginCallback) {
        this.isLoginCallback()
        delete this.isLoginCallback
      }
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
    this.web3.setProvider = () => {
      log.debug('Torus - overrode web3.setProvider')
    }
    // pretend to be Metamask for dapp compatibility reasons
    this.web3.currentProvider.isTorus = true
    inpageProvider.on('accountsChanged', (accounts) => {
      this._updateKeyBtnAddress((accounts && accounts[0]) || '')
    })
    sendSiteMetadata(this.provider._rpcEngine)
    // window.web3 = window.torus.web3
    log.debug('Torus - injected web3')
  }

  // Exposing login function, if called from embed, flag as true
  _showLoginPopup(calledFromEmbed, resolve, reject) {
    this._showLoggingIn()
    if (this.requestedVerifier === undefined || this.requestedVerifier === '') {
      this.modalCloseHandler = () => {
        this._showLoggedOut()
        if (reject) reject(new Error('Modal has been closed'))
      }
      const loginHandler = (verifier) => {
        this.requestedVerifier = verifier
        this._showLoginPopup(calledFromEmbed, resolve, reject)
      }
      Object.keys(this.enabledVerifiers).forEach((verifier) => {
        if (this.enabledVerifiers[verifier]) {
          handleEvent(this[`${verifier}Login`], 'click', loginHandler, [verifier])
        }
      })
    } else {
      const oauthStream = this.communicationMux.getStream('oauth')
      const loginHandler = (data) => {
        const { err, selectedAddress } = data
        if (err) {
          log.error(err)
          this._showLoggedOut()
          if (reject) reject(err)
        } else {
          // returns an array (cause accounts expects it)
          if (resolve) resolve([transformEthAddress(selectedAddress)])
          this._showLoggedIn()
        }
      }
      handleStream(oauthStream, 'data', loginHandler)
      const preopenInstanceId = getPreopenInstanceId()
      this._handleWindow(preopenInstanceId)
      oauthStream.write({ name: 'oauth', data: { calledFromEmbed, verifier: this.requestedVerifier, preopenInstanceId } })
    }
  }

  setProvider({ host = 'mainnet', chainId = 1, networkName = 'mainnet' } = {}) {
    return new Promise((resolve, reject) => {
      const providerChangeStream = this.communicationMux.getStream('provider_change')
      const handler = (chunk) => {
        const { err, success } = chunk.data
        log.info(chunk)
        if (err) {
          reject(err)
        } else if (success) {
          resolve()
        } else reject(new Error('some error occured'))
      }
      handleStream(providerChangeStream, 'data', handler)
      const preopenInstanceId = getPreopenInstanceId()
      this._handleWindow(preopenInstanceId, {
        target: '_blank',
        features: 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=600,width=500',
      })
      providerChangeStream.write({
        name: 'show_provider_change',
        data: {
          network: {
            host,
            chainId,
            networkName,
          },
          type: configuration.networkList.includes(host) ? undefined : 'rpc',
          preopenInstanceId,
          override: false,
        },
      })
    })
  }

  _setProvider({ host = 'mainnet', chainId = 1, networkName = 'mainnet' } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isInitalized) {
        const providerChangeStream = this.communicationMux.getStream('provider_change')
        const handler = (ev) => {
          log.info(ev)
          const { err, success } = ev.data
          if (err) {
            reject(err)
          } else if (success) {
            resolve()
          } else reject(new Error('some error occured'))
        }
        handleStream(providerChangeStream, 'data', handler)
        providerChangeStream.write({
          name: 'show_provider_change',
          data: {
            network: {
              host,
              chainId,
              networkName,
            },
            type: configuration.networkList.includes(host) ? undefined : 'rpc',
            override: true,
          },
        })
      } else reject(new Error('Already initialized'))
    })
  }

  /**
   * Shows the wallet popup
   * @param {string} path the route to open
   */
  showWallet(path) {
    const showWalletStream = this.communicationMux.getStream('show_wallet')
    const finalPath = path ? `/${path}` : ''
    showWalletStream.write({ name: 'show_wallet', data: { path: finalPath } })

    const showWalletHandler = (chunk) => {
      if (chunk.name === 'show_wallet_instance') {
        const { instanceId } = chunk.data
        const finalUrl = `${this.torusUrl}/wallet${finalPath}?integrity=true&instanceId=${instanceId}`
        const walletWindow = new PopupHandler({ url: finalUrl })
        walletWindow.open()
      }
    }

    handleStream(showWalletStream, 'data', showWalletHandler)
  }

  _toggleSpeedDial() {
    this.torusMenuBtn.classList.toggle('active')
    const isActive = this.torusMenuBtn.classList.contains('active')

    const { torusSpeedDial } = this
    if (isActive) {
      torusSpeedDial.style.display = 'block'
    }

    torusSpeedDial.style.opacity = torusSpeedDial.style.opacity === '0' ? '1' : '0'
    torusSpeedDial.classList.toggle('active')
    const mainTime = isActive ? 0.05 : 1.2
    torusSpeedDial.style.transitionDelay = `${mainTime}s`

    setTimeout(() => {
      let time = isActive ? 0.05 : 0.15
      const values = Object.values(torusSpeedDial.children)
      for (let index = 0; index < values.length; index += 1) {
        const element = values[index]
        element.style.transitionDelay = `${time}s`
        time += isActive ? 0.05 : -0.05
      }
      if (!isActive) {
        torusSpeedDial.style.display = 'none'
      }
    }, 500)
  }

  /**
   * Gets the public address of an user with email
   * @param {VerifierArgs} verifierArgs Verifier Arguments
   */
  async getPublicAddress({ verifier, verifierId, isExtended = false }) {
    // Select random node from the list of endpoints
    if (!configuration.supportedVerifierList.includes(verifier)) throw new Error('Unsupported verifier')
    const nodeDetails = await this.nodeDetailManager.getNodeDetails()
    return this.torusJs.getPublicAddress(
      nodeDetails.torusNodeEndpoints,
      nodeDetails.torusNodePub,
      {
        verifier,
        verifierId,
      },
      isExtended
    )
  }

  /**
   * Exposes the loggedin user info to the Dapp
   * @param {String} message Message to be displayed to the user
   */
  getUserInfo(message) {
    return new Promise((resolve, reject) => {
      if (this.isLoggedIn) {
        const userInfoAccessStream = this.communicationMux.getStream('user_info_access')
        userInfoAccessStream.write({ name: 'user_info_access_request' })
        const userInfoAccessHandler = (chunk) => {
          const {
            name,
            data: { approved, payload, rejected, newRequest },
          } = chunk
          if (name === 'user_info_access_response') {
            if (approved) {
              resolve(payload)
            } else if (rejected) {
              reject(new Error('User rejected the request'))
            } else if (newRequest) {
              const userInfoStream = this.communicationMux.getStream('user_info')
              const userInfoHandler = (handlerChunk) => {
                if (handlerChunk.name === 'user_info_response') {
                  if (handlerChunk.data.approved) {
                    resolve(handlerChunk.data.payload)
                  } else {
                    reject(new Error('User rejected the request'))
                  }
                }
              }
              handleStream(userInfoStream, 'data', userInfoHandler)
              const preopenInstanceId = getPreopenInstanceId()
              this._handleWindow(preopenInstanceId, {
                target: '_blank',
                features: 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=600,width=500',
              })
              userInfoStream.write({ name: 'user_info_request', data: { message, preopenInstanceId } })
            }
          }
        }
        handleStream(userInfoAccessStream, 'data', userInfoAccessHandler)
      } else reject(new Error('User has not logged in yet'))
    })
  }

  _handleWindow(preopenInstanceId, { target, features } = {}) {
    if (preopenInstanceId) {
      const windowStream = this.communicationMux.getStream('window')
      const finalUrl = `${this.torusUrl}/redirect?preopenInstanceId=${preopenInstanceId}`
      const handledWindow = new PopupHandler({ url: finalUrl, target, features })
      handledWindow.open()
      if (!handledWindow.window) {
        this._createPopupBlockAlert(preopenInstanceId)
        return
      }
      windowStream.write({
        name: 'opened_window',
        data: {
          preopenInstanceId,
        },
      })
      const closeHandler = ({ preopenInstanceId: receivedId, close }) => {
        if (receivedId === preopenInstanceId && close) {
          handledWindow.close()
          windowStream.removeListener('data', closeHandler)
        }
      }
      windowStream.on('data', closeHandler)
      handledWindow.once('close', () => {
        windowStream.write({
          data: {
            preopenInstanceId,
            closed: true,
          },
        })
        windowStream.removeListener('data', closeHandler)
      })
    }
  }

  paymentProviders = configuration.paymentProviders

  /**
   * Exposes the topup api of torus
   * Allows the dapp to trigger a payment method directly
   * If no params are provided, it defaults to { selectedAddress? = 'TORUS' fiatValue = MIN_FOR_PROVIDER;
   * selectedCurrency? = 'USD'; selectedCryptoCurrency? = 'ETH'; }
   * @param {Enum} provider Supported options are moonpay, wyre, rampnetwork, xanpool
   * @param {PaymentParams} params PaymentParams
   * @returns {Promise<boolean>} boolean indicates whether user has successfully completed the topup flow
   */
  initiateTopup(provider, params) {
    return new Promise((resolve, reject) => {
      if (this.isInitalized) {
        const { errors, isValid } = validatePaymentProvider(provider, params)
        if (!isValid) {
          reject(new Error(JSON.stringify(errors)))
          return
        }
        const topupStream = this.communicationMux.getStream('topup')
        const topupHandler = (chunk) => {
          if (chunk.name === 'topup_response') {
            if (chunk.data.success) {
              resolve(chunk.data.success)
            } else {
              reject(new Error(chunk.data.error))
            }
          }
        }
        handleStream(topupStream, 'data', topupHandler)
        const preopenInstanceId = getPreopenInstanceId()
        this._handleWindow(preopenInstanceId)
        topupStream.write({ name: 'topup_request', data: { provider, params, preopenInstanceId } })
      } else reject(new Error('User has not initialized in yet'))
    })
  }

  setEmbedWhiteLabel(element) {
    // Set whitelabel
    if (this.whiteLabel.theme) {
      const isDark = this.whiteLabel.theme.isDark || false
      const theme = this.whiteLabel.theme.colors
      if (isDark) element.classList.add('torus-dark')

      if (theme.torusBrand1) element.style.setProperty('--torus-brand-1', theme.torusBrand1)
      if (theme.torusGray2) element.style.setProperty('--torus-gray-2', theme.torusGray2)
    }
  }
}

export default Torus
