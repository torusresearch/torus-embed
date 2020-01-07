import sriToolbox from 'sri-toolbox'
import log from 'loglevel'
import LocalMessageDuplexStream from 'post-message-stream'
import Web3 from 'web3'
import randomId from 'random-id'
import NodeDetailManager from '@toruslabs/fetch-node-details'
import TorusJs from '@toruslabs/torus.js'
import MetamaskInpageProvider from './inpage-provider'
import { setupMultiplex } from './stream-utils'
import { runOnLoad, htmlToElement, transformEthAddress, handleEvent, handleStream } from './embedUtils'
import configuration from './config'
import PopupHandler from './PopupHandler'

const torusJs = new TorusJs()

const { GOOGLE, FACEBOOK, REDDIT, TWITCH, DISCORD } = configuration.enums
const defaultVerifiers = {
  [GOOGLE]: true,
  [FACEBOOK]: true,
  [REDDIT]: true,
  [TWITCH]: true,
  [DISCORD]: true
}
cleanContextForImports()

const iframeIntegrity = 'sha384-bdsrEyjfVbywVu59qoXxsjKgyLf/LEaxI/7ibbYfOMpVbZkxP8HTZI78kgzHNIl/'
const expectedCacheControlHeader = 'max-age=3600'

restoreContextAfterImports()

let thirdPartyCookiesSupported = true
const receiveMessage = function(evt) {
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
    this.isRehydrated = false // rehydrated
    this.isLoggedIn = false // ethereum.enable working
    this.isInitalized = false // init done
    this.torusButtonVisibility = true
    this.requestedVerifier = ''
    this.currentVerifier = ''
    this.enabledVerifiers = {}
    this.Web3 = Web3
    this.torusAlert = {}
  }

  init({
    buildEnv = 'production',
    enableLogging = false,
    enabledVerifiers = defaultVerifiers,
    network = {
      host: 'mainnet',
      chainId: 1,
      networkName: 'mainnet'
    },
    showTorusButton = true
  } = {}) {
    return new Promise((resolve, reject) => {
      if (this.isInitalized) reject(new Error('Already initialized'))
      let torusUrl
      let logLevel
      switch (buildEnv) {
        case 'staging':
          torusUrl = 'https://staging.tor.us/v0.2.11'
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
          torusUrl = 'https://app.tor.us/v0.2.11'
          logLevel = 'error'
          break
      }
      this.torusUrl = torusUrl
      this.enabledVerifiers = { ...defaultVerifiers, ...enabledVerifiers }
      log.setDefaultLevel(logLevel)
      if (enableLogging) log.enableAll()
      else log.disableAll()
      this.torusButtonVisibility = showTorusButton
      this._createWidget(torusUrl)
      const attachIFrame = () => {
        window.document.body.appendChild(this.torusIframe)
      }
      if (buildEnv !== 'testing' && buildEnv !== 'development') {
        // hacky solution to check for iframe integrity
        const fetchUrl = torusUrl + '/popup'
        fetch(fetchUrl, { cache: 'reload' })
          .then(resp => {
            if (resp.headers.get('Cache-Control') !== expectedCacheControlHeader) {
              throw new Error('Unexpected Cache-Control headers, got ' + resp.headers.get('Cache-Control'))
            }
            return resp.text()
          })
          .then(response => {
            const integrity = sriToolbox.generate(
              {
                algorithms: ['sha384']
              },
              response
            )
            log.info(integrity, 'integrity')
            if (integrity === iframeIntegrity) {
              runOnLoad(attachIFrame.bind(this))
              runOnLoad(() => this._setupWeb3())
              runOnLoad(() =>
                this._setProvider(network)
                  .then(() => {
                    this.isInitalized = true
                    resolve()
                  })
                  .catch(err => reject(err))
              )
            } else {
              try {
                this._cleanUp()
              } catch (error) {
                reject(error)
              } finally {
                reject(new Error('Integrity check failed'))
              }
            }
          })
      } else {
        runOnLoad(attachIFrame.bind(this))
        runOnLoad(() => this._setupWeb3())
        runOnLoad(() =>
          this._setProvider(network)
            .then(() => {
              this.isInitalized = true
              resolve()
            })
            .catch(err => reject(err))
        )
      }
    })
  }

  _checkThirdPartyCookies() {
    if (!thirdPartyCookiesSupported) {
      this._createAlert()
      throw new Error('Third party cookies not supported')
    }
  }

  /**
   * Logs the user in
   */
  login({ verifier } = {}) {
    if (!this.isInitalized) throw new Error('Call init() first')
    if (this.isLoggedIn) throw new Error('User has already logged in')
    if (verifier && !this.enabledVerifiers[verifier]) throw new Error('Given verifier is not enabled')
    if (!verifier) {
      this.requestedVerifier = ''
      return this.ethereum.enable()
    } else if (configuration.verifierList.includes(verifier)) {
      this.requestedVerifier = verifier
      return this.ethereum.enable()
    } else {
      throw new Error('Unsupported verifier')
    }
  }

  /**
   * Logs the user out
   */
  logout() {
    return new Promise((resolve, reject) => {
      if (!this.isLoggedIn) reject(new Error('User has not logged in yet'))
      else {
        const logOutStream = this.communicationMux.getStream('logout')
        logOutStream.write({ name: 'logOut' })
        var statusStream = this.communicationMux.getStream('status')
        const statusStreamHandler = status => {
          if (!status.loggedIn) {
            this.isLoggedIn = false
            this.isRehydrated = false
            this.currentVerifier = ''
            this.requestedVerifier = ''
            resolve()
          } else reject(new Error('Some Error Occured'))
        }
        handleStream(statusStream, 'data', statusStreamHandler)
      }
    })
  }

  /**
   * Logs the user out and then cleans up (removes iframe, widget, css)
   */
  cleanUp() {
    return new Promise((resolve, reject) => {
      if (this.isLoggedIn)
        this.logout()
          .then(() => {
            this._cleanUp()
            resolve()
          })
          .catch(err => reject(err))
      else {
        try {
          this._cleanUp()
          resolve()
        } catch (error) {
          reject(error)
        }
      }
    })
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
  }

  /**
   * Show alert for Cookies Required
   */
  _createAlert() {
    this.torusAlert = htmlToElement(
      '<div id="torusAlert" class="torus-alert">' +
        '<h1>Cookies Required</h1>' +
        '<p>Please enable cookies in your browser preferences to access Torus.</p></div>'
    )

    const closeAlert = htmlToElement('<span class="torus-alert-close">x<span>')
    this.torusAlert.appendChild(closeAlert)

    const bindOnLoad = () => {
      closeAlert.addEventListener('click', () => {
        this.torusAlert.remove()
      })
    }

    const attachOnLoad = () => {
      window.document.body.appendChild(this.torusAlert)
    }

    runOnLoad(attachOnLoad.bind(this))
    runOnLoad(bindOnLoad.bind(this))
  }

  /**
   * Show alert for when popup is blocked
   */
  _createPopupBlockAlert(preopenInstanceId) {
    const torusAlert = htmlToElement(
      '<div id="torusAlert" class="torus-alert">' +
        '<h1 class="torus-alert__title">Action Required</h1>' +
        '<p class="torus-alert__desc">You have a pending action that needs to be completed in a pop-up window </p></div>'
    )

    const successAlert = htmlToElement('<div><button class="torus-alert-btn">Confirm</button></div>')
    torusAlert.appendChild(successAlert)
    const bindOnLoad = () => {
      successAlert.addEventListener('click', () => {
        this._handleWindow(preopenInstanceId, {
          target: '_blank',
          features: 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=660,width=500'
        })
        torusAlert.remove()
      })
    }

    const attachOnLoad = () => {
      window.document.body.appendChild(torusAlert)
    }

    runOnLoad(attachOnLoad.bind(this))
    runOnLoad(bindOnLoad.bind(this))
  }

  /**
   * Creates the widget
   */
  _createWidget(torusUrl) {
    var link = window.document.createElement('link')

    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('type', 'text/css')
    link.setAttribute('href', torusUrl + '/css/widget.css')

    this.styleLink = link

    this.torusWidget = htmlToElement('<div id="torusWidget" class="widget"></div>')

    // Loading spinner
    const spinner = htmlToElement(
      '<div class="spinner"><div class="beat beat-odd"></div><div class="beat beat-even"></div><div class="beat beat-odd"></div></div>'
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
    this.torusSpeedDial = htmlToElement('<ul class="speed-dial-list" style="transition-delay: 0.05s">')
    this.torusSpeedDial.style.opacity = '0'
    const homeBtn = htmlToElement('<li><button class="torus-btn torus-btn--home" title="Wallet Home Page"></button></li>')

    const tooltipNote = htmlToElement('<div class="tooltip-text tooltip-note">Copy public address to clipboard</div>')
    const tooltipCopied = htmlToElement('<div class="tooltip-text tooltip-copied">Copied!</div>')
    this.keyBtn = htmlToElement('<button class="torus-btn torus-btn--text">0xe5..</button>')
    const keyContainer = htmlToElement('<li class="tooltip"></li>')

    keyContainer.appendChild(this.keyBtn)
    keyContainer.appendChild(tooltipNote)
    keyContainer.appendChild(tooltipCopied)

    const transferBtn = htmlToElement('<li><button class="torus-btn torus-btn--transfer" title="Wallet Transfer Page"></button></li>')

    this.torusSpeedDial.appendChild(homeBtn)
    this.torusSpeedDial.appendChild(keyContainer)
    this.torusSpeedDial.appendChild(transferBtn)

    this.torusWidget.prepend(this.torusSpeedDial)

    // Multiple login modal
    this.torusLoginModal = htmlToElement('<div id="login-modal" class="torus-login-modal"></div>')
    this.torusLoginModal.style.display = 'none'
    const modalContainer = htmlToElement(
      '<div class="torus-login-modal__modal-container">' +
        '<div class="torus-login-modal__close-container">' +
        '<span id="close" class="torus-login-modal__close">&times;</span>' +
        '</div>' +
        '</div>'
    )

    const modalContent = htmlToElement(
      '<div class="torus-login-modal__modal-content">' +
        '<div class="torus-login-modal__header-container"><img src="' +
        torusUrl +
        '/images/torus-logo-white.svg' +
        '"><div class="torus-login-modal__login-header">Login</div></div>' +
        '</div>'
    )

    const formContainer = htmlToElement(
      '<div class="torus-login-modal__form-container">' +
        '<p class="torus-login-modal__login-subtitle">You are just one step away from your digital wallet.</p>' +
        '</div>'
    )

    this.googleLogin = htmlToElement(
      '<button id="login-google" class="torus-login-modal__login-google"><img src="' +
        torusUrl +
        '/img/icons/google.svg' +
        '">Sign in with Google</button>'
    )

    // List for other logins
    const loginList = htmlToElement('<ul id="login-list" class="torus-login-modal__login-list"></ul>')
    this.facebookLogin = htmlToElement(
      '<li>' +
        '<button id="login-facebook" class="torus-login-modal__login-btn torus-login-modal__login-btn--facebook" title="Login with Facebook">' +
        '<img src="' +
        torusUrl +
        '/img/icons/facebook.svg' +
        '"></button></li>'
    )
    this.twitchLogin = htmlToElement(
      '<li><button id="login-twitch" class="torus-login-modal__login-btn torus-login-modal__login-btn--twitch" title="Login with Twitch"><img src="' +
        torusUrl +
        '/img/icons/twitch.svg' +
        '"></button></li>'
    )
    this.redditLogin = htmlToElement(
      '<li><button id="login-reddit" class="torus-login-modal__login-btn torus-login-modal__login-btn--reddit" title="Login with Reddit"><img src="' +
        torusUrl +
        '/img/icons/reddit.svg' +
        '"></button></li>'
    )
    this.discordLogin = htmlToElement(
      '<li>' +
        '<button id="login-discord" class="torus-login-modal__login-btn torus-login-modal__login-btn--discord" title="Login with Discord">' +
        '<img src="' +
        torusUrl +
        '/img/icons/discord.svg' +
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
      '<div class="torus-login-modal__login-note">By logging in, you accept Torus\' ' +
        '<a href="https://docs.tor.us/legal/terms-and-conditions" target="_blank">Terms and Conditions</a></div>'
    )

    formContainer.appendChild(loginNote)
    modalContent.appendChild(formContainer)

    modalContainer.appendChild(modalContent)
    this.torusLoginModal.appendChild(modalContainer)

    // Append login codes to widget
    this.torusWidget.appendChild(this.torusLoginModal)

    // Iframe code
    this.torusIframe = htmlToElement('<iframe id="torusIframe" frameBorder="0" src="' + torusUrl + '/popup"></iframe>')
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
        const publicKey = htmlToElement('<input type="text" value="' + this.ethereum.selectedAddress + '">')
        this.torusWidget.prepend(publicKey)
        publicKey.select()
        publicKey.setSelectionRange(0, 99999) // For mobile

        document.execCommand('copy')
        this.torusWidget.removeChild(publicKey)

        tooltipCopied.classList.add('active')
        tooltipNote.classList.add('active')

        var self = this
        setTimeout(function() {
          tooltipCopied.classList.remove('active')
          tooltipNote.classList.remove('active')
          self._toggleSpeedDial()
        }, 1000)
      })

      this.torusMenuBtn.addEventListener('click', () => {
        this._toggleSpeedDial()
      })

      // Login Modal Listeners
      modalContainer.querySelector('#close').addEventListener('click', () => {
        this.torusLoginModal.style.display = 'none'
        if (this.modalCloseHandler) this.modalCloseHandler()
        delete this.modalCloseHandler
      })
    }

    const attachOnLoad = () => {
      window.document.head.appendChild(link)
      window.document.body.appendChild(this.torusWidget)
    }

    runOnLoad(attachOnLoad.bind(this))
    runOnLoad(bindOnLoad.bind(this))

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
    this.keyBtn.innerText = selectedAddress && selectedAddress.slice(0, 4) + '..'
  }

  _showLoggedOut() {
    this.torusMenuBtn.style.display = 'none'
    this.torusLogin.style.display = this.torusButtonVisibility ? 'block' : 'none'
    this.torusLoadingBtn.style.display = 'none'
    this.torusLoginModal.style.display = 'none'
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
    // window.metamaskStream = this.communicationStream

    // compose the inpage provider
    const inpageProvider = new MetamaskInpageProvider(this.metamaskStream)

    // detect eth_requestAccounts and pipe to enable for now
    const detectAccountRequestPrototypeModifier = m => {
      const originalMethod = inpageProvider[m]
      const self = this
      inpageProvider[m] = function({ method }) {
        if (method === 'eth_requestAccounts') {
          return self.ethereum.enable()
        }
        return originalMethod.apply(this, arguments)
      }
    }

    detectAccountRequestPrototypeModifier('send')
    detectAccountRequestPrototypeModifier('sendAsync')

    inpageProvider.setMaxListeners(100)
    inpageProvider.enable = () => {
      this._checkThirdPartyCookies()
      this._showLoggingIn()
      return new Promise((resolve, reject) => {
        // TODO: Handle errors when pipe is broken (eg. popup window is closed)

        // If user is already logged in, we assume they have given access to the website
        this.web3.eth.getAccounts(
          function(err, res) {
            const self = this
            if (err) {
              setTimeout(() => {
                self._showLoggedOut()
                reject(err)
              }, 50)
            } else if (Array.isArray(res) && res.length > 0) {
              // If user is already rehydrated, resolve this
              // else wait for something to be written to status stream
              const handleRehydration = () => {
                this.isLoggedIn = true
                if (this.requestedVerifier !== '' && this.currentVerifier !== this.requestedVerifier) {
                  const requestedVerifier = this.requestedVerifier
                  this.logout()
                    .then(_ => {
                      this.requestedVerifier = requestedVerifier
                      this._showLoginPopup(true, resolve, reject)
                    })
                    .catch(err => reject(err))
                } else {
                  self._showLoggedIn()
                  resolve(res)
                }
              }
              if (this.isRehydrated) {
                handleRehydration()
              } else {
                this.isRehydratedCallback = handleRehydration
              }
            } else {
              // set up listener for login
              this._showLoginPopup(true, resolve, reject)
            }
          }.bind(this)
        )
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
    communicationMux.setMaxListeners(20)
    this.communicationMux = communicationMux

    var windowStream = communicationMux.getStream('window')
    windowStream.on('data', chunk => {
      if (chunk.name === 'create_window') {
        this._createPopupBlockAlert(chunk.data.preopenInstanceId)
      }
    })

    // Show torus button if wallet has been hydrated/detected
    var statusStream = communicationMux.getStream('status')
    statusStream.on('data', status => {
      // rehydration
      if (status.rehydrate && status.loggedIn) {
        this.isRehydrated = status.rehydrate
        this.currentVerifier = status.verifier
        if (this.isRehydratedCallback) {
          this.isRehydratedCallback()
          delete this.isRehydratedCallback
        }
      }
      // normal login
      else if (status.loggedIn) {
        this.isLoggedIn = status.loggedIn
        this.currentVerifier = status.verifier
        this._showLoggedIn()
      } // logout
      else this._showLoggedOut()
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

    inpageProvider.init({ ethereum: this.ethereum, web3: this.web3 })
    inpageProvider.publicConfigStore.subscribe(
      function(state) {
        this._updateKeyBtnAddress(state.selectedAddress)
      }.bind(this)
    )
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
      const loginHandler = verifier => {
        this.requestedVerifier = verifier
        this._showLoginPopup(calledFromEmbed, resolve, reject)
      }
      Object.keys(this.enabledVerifiers).forEach(verifier => {
        if (this.enabledVerifiers[verifier]) {
          handleEvent(this[`${verifier}Login`], 'click', loginHandler, [verifier])
        }
      })
    } else {
      var oauthStream = this.communicationMux.getStream('oauth')
      const self = this
      var loginHandler = function(data) {
        var { err, selectedAddress } = data
        if (err) {
          log.error(err)
          self._showLoggedOut()
          if (reject) reject(err)
        } else {
          // returns an array (cause accounts expects it)
          if (resolve) resolve([transformEthAddress(selectedAddress)])
          self._showLoggedIn()
        }
      }
      handleStream(oauthStream, 'data', loginHandler)
      const preopenInstanceId = randomId()
      this._handleWindow(preopenInstanceId)
      oauthStream.write({ name: 'oauth', data: { calledFromEmbed, verifier: this.requestedVerifier, preopenInstanceId: preopenInstanceId } })
    }
  }

  setProvider({ host = 'mainnet', chainId = 1, networkName = 'mainnet' } = {}) {
    return new Promise((resolve, reject) => {
      const providerChangeStream = this.communicationMux.getStream('provider_change')
      const handler = chunk => {
        var { err, success } = chunk.data
        log.info(chunk)
        if (err) {
          reject(err)
        } else if (success) {
          resolve()
        } else reject(new Error('some error occured'))
      }
      handleStream(providerChangeStream, 'data', handler)
      const preopenInstanceId = randomId()
      this._handleWindow(preopenInstanceId, {
        target: '_blank',
        features: 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=600,width=500'
      })
      providerChangeStream.write({
        name: 'show_provider_change',
        data: {
          network: {
            host,
            chainId,
            networkName
          },
          type: configuration.networkList.includes(host) ? undefined : 'rpc',
          preopenInstanceId: preopenInstanceId,
          override: false
        }
      })
    })
  }

  _setProvider({ host = 'mainnet', chainId = 1, networkName = 'mainnet' } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isInitalized) {
        const providerChangeStream = this.communicationMux.getStream('provider_change')
        const handler = function(ev) {
          log.info(ev)
          var { err, success } = ev.data
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
              networkName
            },
            type: configuration.networkList.includes(host) ? undefined : 'rpc',
            override: true
          }
        })
      } else reject(new Error('Already initialized'))
    })
  }

  /**
   * Shows the wallet popup
   * @param {string} path the route to open
   */
  showWallet(path) {
    var showWalletStream = this.communicationMux.getStream('show_wallet')
    const finalPath = path ? `/${path}` : ''
    showWalletStream.write({ name: 'show_wallet', data: { path: finalPath } })

    const showWalletHandler = chunk => {
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

    var torusSpeedDial = this.torusSpeedDial
    torusSpeedDial.style.opacity = torusSpeedDial.style.opacity === '0' ? '1' : '0'
    torusSpeedDial.classList.toggle('active')
    var mainTime = isActive ? 0.05 : 1.2
    torusSpeedDial.style.transitionDelay = mainTime + 's'

    setTimeout(function() {
      let time = isActive ? 0.05 : 0.15
      Object.values(torusSpeedDial.children).forEach(element => {
        element.style.transitionDelay = time + 's'
        time += isActive ? 0.05 : -0.05
      })
    }, 200)
  }

  /**
   * Gets the public address of an user with email
   * @param {String} verifier Oauth Provider
   * @param {String} verifierId Unique idenfier of oauth provider
   */
  getPublicAddress({ verifier, verifierId }) {
    // Select random node from the list of endpoints
    return new Promise((resolve, reject) => {
      if (!configuration.supportedVerifierList.includes(verifier)) reject(new Error('Unsupported verifier'))
      NodeDetailManager.getNodeDetails()
        .then(nodeDetails => {
          return torusJs.getPubKeyAsync(nodeDetails.torusNodeEndpoints, { verifier: verifier, verifierId: verifierId })
        })
        .then(pubAddr => resolve(pubAddr))
        .catch(err => reject(err))
    })
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
        const userInfoAccessHandler = chunk => {
          const {
            name,
            data: { approved, payload, rejected, newRequest }
          } = chunk
          if (name === 'user_info_access_response') {
            if (approved) {
              resolve(payload)
            } else if (rejected) {
              reject(new Error('User rejected the request'))
            } else if (newRequest) {
              const userInfoStream = this.communicationMux.getStream('user_info')
              const userInfoHandler = chunk => {
                if (chunk.name === 'user_info_response') {
                  if (chunk.data.approved) {
                    resolve(chunk.data.payload)
                  } else {
                    reject(new Error('User rejected the request'))
                  }
                }
              }
              handleStream(userInfoStream, 'data', userInfoHandler)
              const preopenInstanceId = randomId()
              this._handleWindow(preopenInstanceId, {
                target: '_blank',
                features: 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=600,width=500'
              })
              userInfoStream.write({ name: 'user_info_request', data: { message: message, preopenInstanceId: preopenInstanceId } })
            }
          }
        }
        handleStream(userInfoAccessStream, 'data', userInfoAccessHandler)
      } else reject(new Error('User has not logged in yet'))
    })
  }

  _handleWindow(preopenInstanceId, { target, features } = {}) {
    const windowStream = this.communicationMux.getStream('window')
    const finalUrl = this.torusUrl + `/redirect?preopenInstanceId=${preopenInstanceId}`
    const handledWindow = new PopupHandler({ url: finalUrl, target: target, features: features })
    handledWindow.open()
    windowStream.write({
      name: 'opened_window',
      data: {
        preopenInstanceId: preopenInstanceId
      }
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
          preopenInstanceId: preopenInstanceId,
          closed: true
        }
      })
    })
  }

  /**
   * Exposes the topup api of torus
   * Allows the dapp to trigger a payment method directly
   * If no params are provided, it defaults to { fiatValue = MIN_FOR_PROVIDER; selectedCurrency? = 'USD'; selectedCryptoCurrency? = 'ETH'; }
   * @param {Enum} provider Supported options are moonpay, wyre and coindirect
   * @param {PaymentParams} params PaymentParams is { fiatValue?: Number; selectedCurrency?: string; selectedCryptoCurrency?: string; }
   * @returns {Promise<boolean>} boolean indicates whether user has successfully completed the topup flow
   */
  initiateTopup(provider, params) {
    return new Promise((resolve, reject) => {
      if (this.isLoggedIn) {
        const topupStream = this.communicationMux.getStream('topup')
        const topupHandler = chunk => {
          if (chunk.name === 'topup_response') {
            if (chunk.data.success) {
              resolve(chunk.data.success)
            } else {
              reject(new Error(chunk.data.error))
            }
          }
        }
        handleStream(topupStream, 'data', topupHandler)
        const preopenInstanceId = randomId()
        this._handleWindow(preopenInstanceId)
        topupStream.write({ name: 'topup_request', data: { provider: provider, params: params, preopenInstanceId: preopenInstanceId } })
      } else reject(new Error('User has not logged in yet'))
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

export default Torus
