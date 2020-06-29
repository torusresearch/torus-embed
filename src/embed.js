/* eslint-disable class-methods-use-this */
import NodeDetailManager from '@toruslabs/fetch-node-details'
import TorusJs from '@toruslabs/torus.js'
import deepmerge from 'deepmerge'
import LocalMessageDuplexStream from 'post-message-stream'
import Web3 from 'web3'

import { version } from '../package.json'
import TorusChannelProvider from './channel-provider'
import configuration from './config'
import { handleStream, htmlToElement, runOnLoad, transformEthAddress } from './embedUtils'
import MetamaskInpageProvider from './inpage-provider'
import generateIntegrity from './integrity'
import log from './loglevel'
import PopupHandler from './PopupHandler'
import { sendSiteMetadata } from './siteMetadata'
import { setupMultiplex } from './stream-utils'
import { getPreopenInstanceId, getTorusUrl, getUserLanguage, validatePaymentProvider } from './utils'

const { GOOGLE, FACEBOOK, REDDIT, TWITCH, DISCORD } = configuration.enums
const defaultVerifiers = {
  [GOOGLE]: true,
  [FACEBOOK]: true,
  [REDDIT]: true,
  [TWITCH]: true,
  [DISCORD]: true,
}

const iframeIntegrity = 'sha384-l05bLryIxmhdnoc0wB7esCvtects3uSo00DuQPoSBY6SYbNi+14FYkYuNi3y52xa'

const expectedCacheControlHeader = 'max-age=3600'

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
    this.torusUrl = ''
    this.torusIframe = {}
    this.styleLink = {}
    this.isLoggedIn = false // ethereum.enable working
    this.isInitalized = false // init done
    this.torusWidgetVisibility = true
    this.requestedVerifier = ''
    this.currentVerifier = ''
    this.enabledVerifiers = {}
    this.loginConfig = {}
    this.Web3 = Web3
    this.torusAlert = {}
    this.nodeDetailManager = new NodeDetailManager()
    this.torusJs = new TorusJs()
    this.whiteLabel = {}
  }

  async init({
    buildEnv = 'production',
    enableLogging = false,
    // deprecated: use loginConfig instead
    enabledVerifiers = defaultVerifiers,
    network = {
      host: 'mainnet',
      chainId: null,
      networkName: '',
    },
    loginConfig = {},
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
    this.enabledVerifiers = enabledVerifiers
    this.loginConfig = loginConfig
    this.whiteLabel = whiteLabel
    log.setDefaultLevel(logLevel)
    if (enableLogging) log.enableAll()
    else log.disableAll()
    this.torusWidgetVisibility = showTorusButton
    // Iframe code
    this.torusIframe = htmlToElement(
      `<iframe 
        id="torusIframe"
        class="torusIframe"
        src="${torusUrl}/popup"
        style="display: none; position: fixed; top: 0; right: 0; width: 100%; height: 100%; border: none; border-radius: 0;"
      ></iframe>`
    )

    const link = window.document.createElement('link')
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('type', 'text/css')
    link.setAttribute('href', `${torusUrl}/css/widget.css`)
    this.styleLink = link

    const { defaultLanguage = getUserLanguage(), customTranslations = {} } = this.whiteLabel
    const mergedTranslations = deepmerge(configuration.translations, customTranslations)
    const languageTranslations = mergedTranslations[defaultLanguage] || configuration.translations[getUserLanguage()]
    this.embedTranslations = languageTranslations.embed

    const attachIFrame = () => {
      window.document.head.appendChild(this.styleLink)
      window.document.body.appendChild(this.torusIframe)
      this.torusIframe.onload = () => {
        this._displayIframe()
      }
    }
    const handleSetup = async () => {
      await runOnLoad(attachIFrame)
      await runOnLoad(this._setupWeb3.bind(this))
      const initStream = this.communicationMux.getStream('init_stream')
      const initCompletePromise = new Promise((resolve, reject) => {
        initStream.on('data', (chunk) => {
          console.log(chunk)
          const { name, data, error } = chunk
          if (name === 'init_complete' && data.success) {
            // resolve promise
            resolve()
          } else if (error) {
            reject(new Error(error))
          }
        })
      })
      await runOnLoad(async () => {
        initStream.write({
          name: 'init_stream',
          data: {
            enabledVerifiers: this.enabledVerifiers,
            loginConfig: this.loginConfig,
            whiteLabel: this.whiteLabel,
            buttonPosition: this.buttonPosition,
            torusWidgetVisibility: this.torusWidgetVisibility,
          },
        })
        await this._setProvider(network)
        await initCompletePromise
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

  /** @ignore */
  _checkThirdPartyCookies() {
    if (!thirdPartyCookiesSupported) {
      this._createAlert(
        '<div id="torusAlert" class="torus-alert">' +
          `<h1>${this.embedTranslations.cookiesRequired}</h1>` +
          `<p>${this.embedTranslations.enableCookies}</p>` +
          `<p>${this.embedTranslations.forMoreInfo}<a href="https://docs.tor.us/faq/users#cookies" target="_blank"` +
          `rel="noreferrer noopener">${this.embedTranslations.clickHere}</a></p>` +
          '</div>'
      )
      throw new Error('Third party cookies not supported')
    }
  }

  login({ verifier } = {}) {
    if (!this.isInitalized) throw new Error('Call init() first')
    if (!verifier) {
      this.requestedVerifier = ''
      return this.ethereum.enable()
    }
    this.requestedVerifier = verifier
    return this.ethereum.enable()
  }

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

  async cleanUp() {
    if (this.isLoggedIn) {
      await this.logout()
    }
    this._cleanUp()
  }

  /** @ignore */
  _cleanUp() {
    function isElement(element) {
      return element instanceof Element || element instanceof HTMLDocument
    }
    if (isElement(this.styleLink) && window.document.body.contains(this.styleLink)) {
      this.styleLink.remove()
      this.styleLink = {}
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

  /** @ignore */
  _createAlert(alertContent) {
    this.torusAlert = htmlToElement(alertContent)

    const closeAlert = htmlToElement('<span id="torusAlert__close">x<span>')
    this.torusAlert.appendChild(closeAlert)

    const bindOnLoad = () => {
      closeAlert.addEventListener('click', () => {
        this.torusAlert.remove()
      })
    }

    this._setEmbedWhiteLabel(this.torusAlert)

    const attachOnLoad = () => {
      window.document.body.appendChild(this.torusAlert)
    }

    runOnLoad(attachOnLoad)
    runOnLoad(bindOnLoad)
  }

  /** @ignore */
  _createPopupBlockAlert(preopenInstanceId) {
    const torusAlert = htmlToElement(
      '<div id="torusAlert">' +
        `<h1 id="torusAlert__title">${this.embedTranslations.actionRequired}</h1>` +
        `<p id="torusAlert__desc">${this.embedTranslations.pendingAction}</p></div>`
    )

    const successAlert = htmlToElement(`<div><button id="torusAlert__btn">${this.embedTranslations.confirm}</button></div>`)
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

    this._setEmbedWhiteLabel(torusAlert)

    const attachOnLoad = () => {
      window.document.body.appendChild(torusAlert)
    }

    runOnLoad(attachOnLoad)
    runOnLoad(bindOnLoad)
  }

  /** @ignore */
  _sendWidgetVisibilityStatus(status) {
    const torusWidgetVisibilityStream = this.communicationMux.getStream('torus-widget-visibility')
    torusWidgetVisibilityStream.write({
      data: status,
    })
  }

  hideTorusButton() {
    this.torusWidgetVisibility = false
    this._sendWidgetVisibilityStatus(false)
    this._displayIframe()
  }

  showTorusButton() {
    this.torusWidgetVisibility = true
    this._sendWidgetVisibilityStatus(true)
    this._displayIframe()
  }

  /** @ignore */
  _displayIframe(isFull = false) {
    const style = {}
    // set phase
    if (!isFull) {
      style.display = this.torusWidgetVisibility ? 'block' : 'none'
      style.height = '70px'
      style.width = '70px'
      switch (this.buttonPosition) {
        case 'top-left':
          style.top = '0px'
          style.left = '0px'
          style.right = 'auto'
          style.bottom = 'auto'
          break
        case 'top-right':
          style.top = '0px'
          style.right = '0px'
          style.left = 'auto'
          style.bottom = 'auto'
          break
        case 'bottom-right':
          style.bottom = '0px'
          style.right = '0px'
          style.top = 'auto'
          style.left = 'auto'
          break
        case 'bottom-left':
        default:
          style.bottom = '0px'
          style.left = '0px'
          style.top = 'auto'
          style.right = 'auto'
          break
      }
    } else {
      style.display = 'block'
      style.width = '100%'
      style.height = '100%'
      style.top = '0px'
      style.right = '0px'
      style.left = '0px'
      style.bottom = '0px'
    }
    Object.assign(this.torusIframe.style, style)
  }

  /** @ignore */
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

    // setup channel stream
    this.channelStream = new LocalMessageDuplexStream({
      name: 'embed_chan',
      target: 'iframe_chan',
      targetWindow: this.torusIframe.contentWindow,
    })
    this.channelStream.setMaxListeners(100)

    this.channelProvider = new TorusChannelProvider(this.channelStream)

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
      this._displayIframe(true)
      if (!thirdPartyCookiesSupported) return Promise.reject(new Error('Third party cookies not supported'))
      return new Promise((resolve, reject) => {
        // If user is already logged in, we assume they have given access to the website
        inpageProvider.sendAsync({ method: 'eth_requestAccounts', params: [] }, (err, { result: res } = {}) => {
          if (err) {
            setTimeout(() => {
              this._displayIframe()
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
                this._displayIframe()
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
    communicationMux.setMaxListeners(50)
    this.communicationMux = communicationMux

    const windowStream = communicationMux.getStream('window')
    windowStream.on('data', (chunk) => {
      if (chunk.name === 'create_window') {
        this._createPopupBlockAlert(chunk.data.preopenInstanceId)
      }
    })

    // show torus widget if button clicked
    const widgetStream = communicationMux.getStream('widget')
    widgetStream.on('data', (chunk) => {
      const { data } = chunk
      this._displayIframe(data)
    })

    // Show torus button if wallet has been hydrated/detected
    const statusStream = communicationMux.getStream('status')
    statusStream.on('data', (status) => {
      // login
      if (status.loggedIn) {
        this.isLoggedIn = status.loggedIn
        this.currentVerifier = status.verifier
      } // logout
      else this._displayIframe()
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
    sendSiteMetadata(this.provider._rpcEngine)
    // window.web3 = window.torus.web3
    log.debug('Torus - injected web3')
  }

  /** @ignore */
  _showLoginPopup(calledFromEmbed, resolve, reject) {
    this._displayIframe(true)
    const loginHandler = (data) => {
      const { err, selectedAddress } = data
      if (err) {
        log.error(err)
        this._displayIframe()
        if (reject) reject(err)
      } else {
        // returns an array (cause accounts expects it)
        if (resolve) resolve([transformEthAddress(selectedAddress)])
        this._displayIframe()
      }
    }
    const oauthStream = this.communicationMux.getStream('oauth')
    if (this.requestedVerifier === undefined || this.requestedVerifier === '') {
      handleStream(oauthStream, 'data', loginHandler)
      oauthStream.write({ name: 'oauth_modal', data: { calledFromEmbed } })
    } else {
      handleStream(oauthStream, 'data', loginHandler)
      const preopenInstanceId = getPreopenInstanceId()
      this._handleWindow(preopenInstanceId)
      oauthStream.write({ name: 'oauth', data: { calledFromEmbed, verifier: this.requestedVerifier, preopenInstanceId } })
    }
  }

  setProvider({ host = 'mainnet', chainId = null, networkName = '' } = {}) {
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

  /** @ignore */
  _setProvider({ host = 'mainnet', chainId = null, networkName = '' } = {}) {
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

  showWallet(path, params = {}) {
    const showWalletStream = this.communicationMux.getStream('show_wallet')
    const finalPath = path ? `/${path}` : ''
    showWalletStream.write({ name: 'show_wallet', data: { path: finalPath } })

    const showWalletHandler = (chunk) => {
      if (chunk.name === 'show_wallet_instance') {
        // Let the error propogate up (hence, no try catch)
        const { instanceId } = chunk.data
        const finalUrl = new URL(`${this.torusUrl}/wallet${finalPath}`)
        // Using URL constructor to prevent js injection and allow parameter validation.!
        finalUrl.searchParams.append('integrity', true)
        finalUrl.searchParams.append('instanceId', instanceId)
        Object.keys(params).forEach((x) => {
          finalUrl.searchParams.append(x, params[x])
        })
        const walletWindow = new PopupHandler({ url: finalUrl })
        walletWindow.open()
      }
    }

    handleStream(showWalletStream, 'data', showWalletHandler)
  }

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

  /** @ignore */
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

  /** @ignore */
  _setEmbedWhiteLabel(element) {
    // Set whitelabel
    const { theme } = this.whiteLabel
    if (theme) {
      const { isDark = false, colors = {} } = theme
      if (isDark) element.classList.add('torus-dark')

      if (colors.torusBrand1) element.style.setProperty('--torus-brand-1', colors.torusBrand1)
      if (colors.torusGray2) element.style.setProperty('--torus-gray-2', colors.torusGray2)
    }
  }
}

export default Torus
