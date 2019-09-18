import sriToolbox from 'sri-toolbox'
import log from 'loglevel'
import LocalMessageDuplexStream from 'post-message-stream'
import MetamaskInpageProvider from './inpage-provider'
import { setupMultiplex } from './stream-utils'
import { runOnLoad, htmlToElement, transformEthAddress } from './embedUtils'
import { post, generateJsonRPCObject, getLookupPromise } from './utils/httpHelpers'
import configuration from './config'
import Web3 from 'web3'

cleanContextForImports()

const iframeIntegrity = 'sha384-YOo2zmYNXxAuBC7uL/91Wujc5UuLFTmC/OpraXc3QtlOLXTRVXvO+09gR/0B9tUF'

restoreContextAfterImports()

class Torus {
  constructor({ stylePosition = 'bottom-left' } = {}) {
    this.stylePosition = stylePosition
    this.torusWidget = {}
    this.torusMenuBtn = {}
    this.torusLogin = {}
    this.torusLoadingBtn = {}
    this.torusIframe = {}
    this.styleLink = {}
    this.isRehydrated = false // rehydrated
    this.isLoggedIn = false // ethereum.enable working
    this.isInitalized = false // init done
    this.torusButtonVisibility = true
    this.Web3 = Web3
  }

  init({
    buildEnv = 'production',
    enableLogging = false,
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
          torusUrl = 'https://staging.tor.us/v0.0.23'
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
          torusUrl = 'https://app.tor.us/v0.0.23'
          logLevel = 'error'
          break
      }
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
        const fetchUrl = torusUrl + '/index.html'
        fetch(fetchUrl)
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
              runOnLoad(attachIFrame.bind(this))
              runOnLoad(() => this._setupWeb3())
              runOnLoad(() =>
                this._setProvider(network).then(() => {
                  this.isInitalized = true
                  resolve()
                })
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
          this._setProvider(network).then(() => {
            this.isInitalized = true
            resolve()
          })
        )
      }
    })
  }

  /**
   * Logs the user in
   */
  login() {
    if (!this.isInitalized) throw new Error('Call init() first')
    if (this.isLoggedIn) throw new Error('User has already logged in')
    else {
      return this.ethereum.enable()
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
            resolve()
          } else reject(new Error('Some Error Occured'))
          statusStream.removeListener('data', statusStreamHandler)
        }
        statusStream.on('data', statusStreamHandler)
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
    if (isElement(this.styleLink)) {
      window.document.head.removeChild(this.styleLink)
      this.styleLink = {}
    }
    if (isElement(this.torusWidget)) {
      window.document.body.removeChild(this.torusWidget)
      this.torusWidget = {}
      this.torusLogin = {}
      this.torusMenuBtn = {}
      this.torusLoadingBtn = {}
    }
    if (isElement(this.torusIframe)) {
      window.document.body.removeChild(this.torusIframe)
      this.torusIframe = {}
    }
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
    this.torusSpeedDial = htmlToElement('<ul class="speed-dial-list">')
    this.homeBtn = htmlToElement('<li><button class="torus-btn torus-btn--home"></button></li>')

    const tooltipNote = htmlToElement('<div class="tooltip-text tooltip-note">Copy public address to clipboard</div>')
    const tooltipCopied = htmlToElement('<div class="tooltip-text tooltip-copied">Copied!</div>')
    this.keyBtn = htmlToElement('<button class="torus-btn torus-btn--text">0xe5..</button>')
    this.keyContainer = htmlToElement('<li class="tooltip"></li>')

    this.keyContainer.appendChild(this.keyBtn)
    this.keyContainer.appendChild(tooltipNote)
    this.keyContainer.appendChild(tooltipCopied)

    this.transferBtn = htmlToElement('<li><button class="torus-btn torus-btn--transfer"></button></li>')

    this.torusSpeedDial.appendChild(this.homeBtn)
    this.torusSpeedDial.appendChild(this.keyContainer)
    this.torusSpeedDial.appendChild(this.transferBtn)

    this.torusWidget.prepend(this.torusSpeedDial)

    // Iframe code
    this.torusIframe = htmlToElement('<iframe id="torusIframe" frameBorder="0" src="' + torusUrl + '/popup"></iframe>')
    // Setup on load code
    const bindOnLoad = () => {
      this.torusLogin.addEventListener('click', () => {
        this._showLoadingAndHideGoogleAndTorus()
        this._showLoginPopup(false)
      })

      this.homeBtn.addEventListener('click', () => {
        this.showWallet(true)
        this._toggleSpeedDial()
      })

      this.transferBtn.addEventListener('click', () => {
        this.showWallet(true, 'transfer')
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
    }

    const attachOnLoad = () => {
      window.document.head.appendChild(link)
      window.document.body.appendChild(this.torusWidget)
    }

    runOnLoad(attachOnLoad.bind(this))
    runOnLoad(bindOnLoad.bind(this))

    switch (this.stylePosition) {
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

  _showLoadingAndHideGoogleAndTorus() {
    if (this.torusButtonVisibility) {
      this.torusLoadingBtn.style.display = 'block'
      this.torusMenuBtn.style.display = 'none'
      this.torusLogin.style.display = 'none'
    }
  }

  _showTorusButtonAndHideGoogle() {
    if (this.torusButtonVisibility) {
      // torusIframeContainer.style.display = 'none'
      this.torusLoadingBtn.style.display = 'none'
      this.torusMenuBtn.style.display = 'block'
      this.torusLogin.style.display = 'none'
    }
  }

  _hideTorusButtonAndShowGoogle() {
    if (this.torusButtonVisibility) {
      this.torusLoadingBtn.style.display = 'none'
      this.torusLogin.style.display = 'block'
      this.torusMenuBtn.style.display = 'none'
    }
  }

  /**
   * Hides the torus button in the dapp context
   */
  hideTorusButton() {
    this.torusButtonVisibility = false
    this.torusLoadingBtn.style.display = 'none'
    this.torusMenuBtn.style.display = 'none'
    this.torusLogin.style.display = 'none'
  }

  /**
   * Shows the torus button in the dapp context.
   * If user is not logged in, it shows login btn. Else, it shows Torus logo btn
   */
  showTorusButton() {
    this.torusButtonVisibility = true
    if (this.isLoggedIn) this._showTorusButtonAndHideGoogle()
    else this._hideTorusButtonAndShowGoogle()
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
      this._showLoadingAndHideGoogleAndTorus()
      return new Promise((resolve, reject) => {
        // TODO: Handle errors when pipe is broken (eg. popup window is closed)

        // If user is already logged in, we assume they have given access to the website
        this.web3.eth.getAccounts(
          function(err, res) {
            const self = this
            if (err) {
              setTimeout(() => {
                self._showTorusButtonAndHideGoogle()
                reject(err)
              }, 50)
            } else if (Array.isArray(res) && res.length > 0) {
              // If user is already rehydrated, resolve this
              // else wait for something to be written to status stream
              if (this.isRehydrated) {
                resolve(res)
                self._showTorusButtonAndHideGoogle()
                this.isLoggedIn = true
              } else {
                const statusStream = this.communicationMux.getStream('status')
                const statusStreamHandler = status => {
                  if (status.loggedIn) {
                    this.isRehydrated = true
                    this.isLoggedIn = true
                    resolve(res)
                  } else reject(new Error('User has not logged in yet'))

                  self._showTorusButtonAndHideGoogle()
                  statusStream.removeListener('data', statusStreamHandler)
                }
                statusStream.on('data', statusStreamHandler)
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

    // Show torus button if wallet has been hydrated/detected
    var statusStream = communicationMux.getStream('status')
    statusStream.on('data', status => {
      // rehydration
      if (status.rehydrate && status.loggedIn) this.isRehydrated = status.rehydrate
      // normal login
      else if (status.loggedIn) {
        this.isLoggedIn = status.loggedIn
        this._showTorusButtonAndHideGoogle()
      } // logout
      else this._hideTorusButtonAndShowGoogle()
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
    var oauthStream = this.communicationMux.getStream('oauth')
    const self = this
    var handler = function(data) {
      var { err, selectedAddress } = data
      if (err) {
        log.error(err)
        self._hideTorusButtonAndShowGoogle()
        if (reject) reject(err)
      } else {
        // returns an array (cause accounts expects it)
        if (resolve) resolve([transformEthAddress(selectedAddress)])
        self._showTorusButtonAndHideGoogle()
      }
      oauthStream.removeListener('data', handler)
    }
    oauthStream.on('data', handler)
    oauthStream.write({ name: 'oauth', data: { calledFromEmbed } })
  }

  setProvider({ host = 'mainnet', chainId = 1, networkName = 'mainnet' } = {}) {
    return new Promise((resolve, reject) => {
      const providerChangeStream = this.communicationMux.getStream('show_provider_change')
      const providerChangeSuccess = this.communicationMux.getStream('provider_change_status')
      const handler = function(ev) {
        var { err, success } = ev.data
        if (err) {
          log.error(err)
          reject(err)
        } else if (success) {
          resolve()
        } else reject(new Error('some error occured'))
        providerChangeSuccess.removeListener('data', handler)
      }
      providerChangeSuccess.on('data', handler)
      if (configuration.networkList.includes(host))
        providerChangeStream.write({
          name: 'show_provider_change',
          data: {
            network: {
              host,
              chainId,
              networkName
            },
            override: false
          }
        })
      else
        providerChangeStream.write({
          name: 'show_provider_change',
          data: {
            network: {
              host,
              chainId,
              networkName
            },
            type: 'rpc'
          },
          override: false
        })
    })
  }

  _setProvider({ host = 'mainnet', chainId = 1, networkName = 'mainnet' } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isInitalized) {
        const providerChangeStream = this.communicationMux.getStream('show_provider_change')
        const providerChangeSuccess = this.communicationMux.getStream('provider_change_status')
        const handler = function(ev) {
          var { err, success } = ev.data
          if (err) {
            log.error(err)
            reject(err)
          } else if (success) {
            resolve()
          } else reject(new Error('some error occured'))
          providerChangeSuccess.removeListener('data', handler)
        }
        providerChangeSuccess.on('data', handler)
        if (configuration.networkList.includes(host))
          providerChangeStream.write({
            name: 'show_provider_change',
            data: {
              network: {
                host,
                chainId,
                networkName
              },
              override: true
            }
          })
        else
          providerChangeStream.write({
            name: 'show_provider_change',
            data: {
              network: {
                host,
                chainId,
                networkName
              },
              type: 'rpc',
              override: true
            }
          })
      } else reject(new Error('Already initialized'))
    })
  }

  /**
   * Shows the wallet popup
   * @param {boolean} calledFromEmbed if called from dapp context
   * @param {string} path the route to open
   */
  showWallet(calledFromEmbed, path) {
    var showWalletStream = this.communicationMux.getStream('show_wallet')
    const finalPath = path ? `/${path}` : ''
    showWalletStream.write({ name: 'show_wallet', data: { calledFromEmbed, path: finalPath } })
  }

  _toggleSpeedDial() {
    this.torusMenuBtn.classList.toggle('active')
    const isActive = this.torusMenuBtn.classList.contains('active')

    var torusSpeedDial = this.torusSpeedDial
    torusSpeedDial.classList.toggle('active')
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
          verifier_id: email.toLowerCase()
        })
      )
        .catch(err => console.error(err))
        .then(lookupShare => {
          if (lookupShare.error) {
            return post(
              node,
              generateJsonRPCObject('KeyAssign', {
                verifier: 'google',
                verifier_id: email.toLowerCase()
              })
            )
          } else if (lookupShare.result) {
            return getLookupPromise(lookupShare)
          }
        })
        .catch(err => console.error(err))
        .then(lookupShare => {
          var ethAddress = lookupShare.result.keys[0].address
          resolve(ethAddress)
        })
        .catch(err => {
          console.error(err)
          reject(err)
        })
    })
  }

  /**
   * Exposes the loggedin user info to the Dapp
   */
  getUserInfo() {
    return new Promise((resolve, reject) => {
      if (this.isLoggedIn) {
        const userInfoStream = this.communicationMux.getStream('user_info')
        userInfoStream.write({ name: 'user_info_request' })
        const userInfoHandler = chunk => {
          if (chunk.name === 'user_info_response') {
            if (chunk.data.approved) {
              resolve(chunk.data.payload)
            } else {
              reject(new Error('User rejected the request'))
            }
          }
          userInfoStream.removeListener('data', userInfoHandler)
        }
        userInfoStream.on('data', userInfoHandler)
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
