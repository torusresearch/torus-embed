/* eslint-disable class-methods-use-this */
import NodeDetailManager from '@toruslabs/fetch-node-details'
import { setAPIKey } from '@toruslabs/http-helpers'
import TorusJs from '@toruslabs/torus.js'
import deepmerge from 'deepmerge'
import LocalMessageDuplexStream from 'post-message-stream'

import configuration from './config'
import { handleStream, htmlToElement, runOnLoad } from './embedUtils'
import MetamaskInpageProvider from './inpage-provider'
import generateIntegrity from './integrity'
import log from './loglevel'
import PopupHandler from './PopupHandler'
import { sendSiteMetadata } from './siteMetadata'
import { setupMultiplex } from './stream-utils'
import {
  FEATURES_CONFIRM_WINDOW,
  FEATURES_DEFAULT_WALLET_WINDOW,
  FEATURES_PROVIDER_CHANGE_WINDOW,
  getPreopenInstanceId,
  getTorusUrl,
  getUserLanguage,
  validatePaymentProvider,
} from './utils'

const { GOOGLE, FACEBOOK, REDDIT, TWITCH, DISCORD } = configuration.enums
const defaultVerifiers = {
  [GOOGLE]: true,
  [FACEBOOK]: true,
  [REDDIT]: true,
  [TWITCH]: true,
  [DISCORD]: true,
}

const iframeIntegrity = 'sha384-fNViQ3yLX3vrF9h74RwiFEZ4eLIMc2maUUwEgQy6ixx6si9DGD6zUJRNuH6h3CTs'

const expectedCacheControlHeader = 'max-age=3600'

const UNSAFE_METHODS = ['eth_sendTransaction', 'eth_signTypedData', 'eth_signTypedData_v3', 'eth_signTypedData_v4', 'personal_sign']

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

// preload for iframe doesn't work https://bugs.chromium.org/p/chromium/issues/detail?id=593267
;(async function preLoadIframe() {
  try {
    const torusIframeHtml = document.createElement('link')
    const { torusUrl } = await getTorusUrl('production', { check: false, hash: iframeIntegrity, version: '' })
    torusIframeHtml.href = `${torusUrl}/popup`
    torusIframeHtml.crossOrigin = 'anonymous'
    torusIframeHtml.type = 'text/html'
    torusIframeHtml.rel = 'prefetch'
    if (torusIframeHtml.relList && torusIframeHtml.relList.supports) {
      if (torusIframeHtml.relList.supports('prefetch')) {
        document.head.appendChild(torusIframeHtml)
      }
    }
  } catch (error) {
    log.warn(error)
  }
})()

class Torus {
  constructor({ buttonPosition = 'bottom-left', modalZIndex = 99999, apiKey = 'torus-default' } = {}) {
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
    this.torusAlert = {}
    this.nodeDetailManager = new NodeDetailManager()
    this.torusJs = new TorusJs({
      metadataHost: 'https://metadata.tor.us',
      allowHost: 'https://signer.tor.us/api/allow',
    })
    this.apiKey = apiKey
    TorusJs.setAPIKey(apiKey)
    setAPIKey(apiKey)
    this.whiteLabel = {}
    this.modalZIndex = modalZIndex
    this.alertZIndex = modalZIndex + 1000
    this.torusAlertContainer = {}
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
      blockExplorer: '',
      ticker: '',
      tickerName: '',
    },
    loginConfig = {},
    showTorusButton = true,
    integrity = {
      check: false,
      hash: iframeIntegrity,
      version: '',
    },
    whiteLabel = {},
  } = {}) {
    if (this.isInitalized) throw new Error('Already initialized')
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
        style="display: none; position: fixed; top: 0; right: 0; width: 100%;
        height: 100%; border: none; border-radius: 0; z-index: ${this.modalZIndex}"
      ></iframe>`
    )

    this.torusAlertContainer = htmlToElement('<div id="torusAlertContainer"></div>')
    this.torusAlertContainer.style.display = 'none'
    this.torusAlertContainer.style.setProperty('z-index', this.alertZIndex)

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
      window.document.body.appendChild(this.torusAlertContainer)
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
            apiKey: this.apiKey,
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
        this.clearInit()
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
      const logoUrl = this._getLogoUrl()
      const torusAlert = htmlToElement(
        '<div id="torusAlert" class="torus-alert torus-alert--v2">' +
          `<div id="torusAlert__logo"><img src="${logoUrl}" /></div>` +
          '<div>' +
          `<h1 id="torusAlert__title">${this.embedTranslations.cookiesRequired}</h1>` +
          `<p id="torusAlert__desc">${this.embedTranslations.enableCookies}</p>` +
          '</div>' +
          '</div>'
      )
      const moreInfo = htmlToElement(
        '<div id="torusAlert__btn-container">' +
          '<div><a id="torusAlert__btn" href="https://docs.tor.us/faq/users#cookies" target="_blank" rel="noreferrer noopener">' +
          `${this.embedTranslations.clickHere}</a></div>` +
          '</div>'
      )

      torusAlert.appendChild(moreInfo)

      this._setEmbedWhiteLabel(torusAlert)

      const attachOnLoad = () => {
        this.torusAlertContainer.style.display = 'block'
        this.torusAlertContainer.appendChild(torusAlert)
      }

      runOnLoad(attachOnLoad)
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
    this.clearInit()
  }

  clearInit() {
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
    if (isElement(this.torusAlertContainer) && window.document.body.contains(this.torusAlertContainer)) {
      this.torusAlert = {}
      this.torusAlertContainer.remove()
      this.torusAlertContainer = {}
    }
    this.isInitalized = false
  }

  /** @ignore */
  _createPopupBlockAlert(preopenInstanceId, url) {
    const logoUrl = this._getLogoUrl()
    const torusAlert = htmlToElement(
      '<div id="torusAlert" class="torus-alert--v2">' +
        `<div id="torusAlert__logo"><img src="${logoUrl}" /></div>` +
        '<div>' +
        `<h1 id="torusAlert__title">${this.embedTranslations.actionRequired}</h1>` +
        `<p id="torusAlert__desc">${this.embedTranslations.pendingAction}</p>` +
        '</div>' +
        '</div>'
    )

    const successAlert = htmlToElement(`<div><a id="torusAlert__btn">${this.embedTranslations.continue}</a></div>`)
    const btnContainer = htmlToElement('<div id="torusAlert__btn-container"></div>')
    btnContainer.appendChild(successAlert)
    torusAlert.appendChild(btnContainer)
    const bindOnLoad = () => {
      successAlert.addEventListener('click', () => {
        this._handleWindow(preopenInstanceId, {
          url,
          target: '_blank',
          features: FEATURES_CONFIRM_WINDOW,
        })
        torusAlert.remove()

        if (this.torusAlertContainer.children.length === 0) this.torusAlertContainer.style.display = 'none'
      })
    }

    this._setEmbedWhiteLabel(torusAlert)

    const attachOnLoad = () => {
      this.torusAlertContainer.style.display = 'block'
      this.torusAlertContainer.appendChild(torusAlert)
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

    inpageProvider.tryPreopenHandle = (payload, cb) => {
      const _payload = payload
      if (UNSAFE_METHODS.includes(payload.method)) {
        const preopenInstanceId = getPreopenInstanceId()
        this._handleWindow(preopenInstanceId, {
          target: '_blank',
          features: FEATURES_CONFIRM_WINDOW,
        })
        _payload.preopenInstanceId = preopenInstanceId
      }
      inpageProvider._rpcEngine.handle(_payload, cb)
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
    communicationMux.setMaxListeners(100)
    this.communicationMux = communicationMux

    const windowStream = communicationMux.getStream('window')
    windowStream.on('data', (chunk) => {
      if (chunk.name === 'create_window') {
        // url is the url we need to open
        // we can pass the final url upfront so that it removes the step of redirecting to /redirect and waiting for finalUrl
        this._createPopupBlockAlert(chunk.data.preopenInstanceId, chunk.data.url)
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

    this.provider = proxiedInpageProvider

    if (this.provider.shouldSendMetadata) sendSiteMetadata(this.provider._rpcEngine)
    log.debug('Torus - injected provider')
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
        if (resolve) resolve([selectedAddress])
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

  setProvider({ host = 'mainnet', chainId = null, networkName = '', ...rest } = {}) {
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
        features: FEATURES_PROVIDER_CHANGE_WINDOW,
      })
      providerChangeStream.write({
        name: 'show_provider_change',
        data: {
          network: {
            host,
            chainId,
            networkName,
            ...rest,
          },
          type: configuration.networkList.includes(host) ? undefined : 'rpc',
          preopenInstanceId,
          override: false,
        },
      })
    })
  }

  /** @ignore */
  _setProvider({ host = 'mainnet', chainId = null, networkName = '', ...rest } = {}) {
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
              ...rest,
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
        const walletWindow = new PopupHandler({ url: finalUrl, features: FEATURES_DEFAULT_WALLET_WINDOW })
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
                features: FEATURES_PROVIDER_CHANGE_WINDOW,
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
  _handleWindow(preopenInstanceId, { url, target, features } = {}) {
    if (preopenInstanceId) {
      const windowStream = this.communicationMux.getStream('window')
      const finalUrl = url || `${this.torusUrl}/redirect?preopenInstanceId=${preopenInstanceId}`
      const handledWindow = new PopupHandler({ url: finalUrl, target, features })
      handledWindow.open()
      if (!handledWindow.window) {
        this._createPopupBlockAlert(preopenInstanceId, finalUrl)
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
      } else reject(new Error('Torus is not initialized yet'))
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

  /** @ignore */
  _getLogoUrl() {
    let logoUrl = `${this.torusUrl}/images/torus_icon-blue.svg`
    if (this.whiteLabel.theme && this.whiteLabel.theme.isDark) {
      logoUrl = this.whiteLabel.logoLight ? this.whiteLabel.logoLight : logoUrl
    } else {
      logoUrl = this.whiteLabel.logoDark ? this.whiteLabel.logoDark : logoUrl
    }

    return logoUrl
  }
}

export default Torus
