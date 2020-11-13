import randomId from '@chaitanyapotti/random-id'
import { get } from '@toruslabs/http-helpers'
import { ethErrors, serializeError } from 'eth-rpc-errors'

import { name, version } from '../package.json'
import config from './config'
import log from './loglevel'

const { paymentProviders } = config

export const validatePaymentProvider = (provider, params) => {
  const errors = {}

  if (!provider) {
    return { errors, isValid: true }
  }

  if (provider && !paymentProviders[provider]) {
    errors.provider = 'Invalid Provider'
    return { errors, isValid: Object.keys(errors).length === 0 }
  }

  const selectedProvider = paymentProviders[provider]
  const selectedParams = params || {}

  // set default values
  // if (!selectedParams.selectedCurrency) [selectedParams.selectedCurrency] = selectedProvider.validCurrencies
  // if (!selectedParams.fiatValue) selectedParams.fiatValue = selectedProvider.minOrderValue
  // if (!selectedParams.selectedCryptoCurrency) [selectedParams.selectedCryptoCurrency] = selectedProvider.validCryptoCurrencies

  // validations
  if (selectedParams.fiatValue) {
    const requestedOrderAmount = +parseFloat(selectedParams.fiatValue) || 0
    if (requestedOrderAmount < selectedProvider.minOrderValue) errors.fiatValue = 'Requested amount is lower than supported'
    if (requestedOrderAmount > selectedProvider.maxOrderValue && selectedProvider.enforceMax)
      errors.fiatValue = 'Requested amount is higher than supported'
  }
  if (selectedParams.selectedCurrency && !selectedProvider.validCurrencies.includes(selectedParams.selectedCurrency)) {
    errors.selectedCurrency = 'Unsupported currency'
  }
  if (selectedParams.selectedCryptoCurrency && !selectedProvider.validCryptoCurrencies.includes(selectedParams.selectedCryptoCurrency)) {
    errors.selectedCryptoCurrency = 'Unsupported cryptoCurrency'
  }
  return { errors, isValid: Object.keys(errors).length === 0 }
}

/**
 * Middleware configuration object
 *
 * @typedef {Object} MiddlewareConfig
 */

/**
 * json-rpc-engine middleware that both logs standard and non-standard error
 * messages and ends middleware stack traversal if an error is encountered
 *
 * @returns {Function} json-rpc-engine middleware function
 */
export const createErrorMiddleware = () => {
  return (req, res, next) => {
    // json-rpc-engine will terminate the request when it notices this error
    if (!req.method || typeof req.method !== 'string') {
      res.error = ethErrors.rpc.invalidRequest({
        message: 'The request `method` must be a non-empty string.',
        data: req,
      })
    }

    next((done) => {
      const { error } = res
      if (!error) {
        return done()
      }
      serializeError(error)
      log.error(`MetaMask - RPC Error: ${error.message}`, error)
      return done()
    })
  }
}

/**
 * Logs a stream disconnection error. Emits an 'error' if bound to an
 * EventEmitter that has listeners for the 'error' event.
 *
 * @param {string} remoteLabel - The label of the disconnected stream.
 * @param {Error} err - The associated error to log.
 */
export function logStreamDisconnectWarning(remoteLabel, err) {
  let warningMsg = `TorusInpageProvider - lost connection to ${remoteLabel}`
  if (err) warningMsg += `\n${err.stack}`
  log.warn(warningMsg)
  if (this.emit && this.listenerCount) {
    if (this.listenerCount('error') > 0) {
      this.emit('error', warningMsg)
    }
  }
}

export const getPreopenInstanceId = () => {
  return randomId()
}

export const getTorusUrl = async (buildEnv, integrity) => {
  let torusUrl
  let logLevel
  let versionUsed = integrity.version || version
  try {
    if ((buildEnv === 'staging' || buildEnv === 'production') && !integrity.version) {
      const response = await get(`${config.api}/latestversion?name=${name}&version=${version}`, {}, { useAPIKey: true })
      versionUsed = response.data
    }
  } catch (error) {
    log.error(error, 'unable to fetch latest version')
  }
  log.info('version used: ', versionUsed)
  switch (buildEnv) {
    case 'staging':
      torusUrl = `https://staging.tor.us/v${versionUsed}`
      logLevel = 'info'
      break
    case 'testing':
      torusUrl = 'https://testing.tor.us'
      logLevel = 'debug'
      break
    case 'lrc':
      torusUrl = 'https://lrc.tor.us'
      logLevel = 'debug'
      break
    case 'beta':
      torusUrl = 'https://beta.tor.us'
      logLevel = 'debug'
      break
    case 'development':
      torusUrl = 'https://localhost:3000'
      logLevel = 'debug'
      break
    default:
      torusUrl = `https://app.tor.us/v${versionUsed}`
      logLevel = 'error'
      break
  }
  return { torusUrl, logLevel }
}

export const getUserLanguage = () => {
  let userLanguage = window.navigator.userLanguage || window.navigator.language || 'en-US'
  userLanguage = userLanguage.split('-')
  userLanguage = Object.prototype.hasOwnProperty.call(config.translations, userLanguage[0]) ? userLanguage[0] : 'en'
  return userLanguage
}

export const EMITTED_NOTIFICATIONS = [
  'eth_subscription', // per eth-json-rpc-filters/subscriptionManager
]

export const NOOP = () => {}

export const FEATURES_PROVIDER_CHANGE_WINDOW = 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=660,width=375'
export const FEATURES_DEFAULT_WALLET_WINDOW = 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=740,width=1315'
export const FEATURES_DEFAULT_POPUP_WINDOW = 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=700,width=1200'
export const FEATURES_CONFIRM_WINDOW = 'directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=700,width=450'
