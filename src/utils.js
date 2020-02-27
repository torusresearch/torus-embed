import log from 'loglevel'
import { serializeError } from 'eth-json-rpc-errors'
import EventEmitter from 'events'
import SafeEventEmitter from 'safe-event-emitter'
import randomId from '@chaitanyapotti/random-id'

import config from './config'

const paymentProviders = config.paymentProviders

export const validatePaymentProvider = (provider, params) => {
  const errors = {}

  if (!paymentProviders[provider]) {
    errors.provider = 'Invalid Provider'
    return { errors, isValid: Object.keys(errors).length === 0 }
  }

  const selectedProvider = paymentProviders[provider]
  const selectedParams = params || {}

  // set default values
  if (!selectedParams.selectedCurrency) selectedParams.selectedCurrency = 'USD'
  if (!selectedParams.fiatValue) selectedParams.fiatValue = selectedProvider.minOrderValue
  if (!selectedParams.selectedCryptoCurrency) selectedParams.selectedCryptoCurrency = 'ETH'

  // validations
  const requestedOrderAmount = +parseFloat(selectedParams.fiatValue)
  if (requestedOrderAmount < selectedProvider.minOrderValue) errors.fiatValue = 'Requested amount is lower than supported'
  if (requestedOrderAmount > selectedProvider.maxOrderValue) errors.fiatValue = 'Requested amount is higher than supported'
  if (!selectedProvider.validCurrencies.includes(selectedParams.selectedCurrency)) errors.selectedCurrency = 'Unsupported currency'
  if (!selectedProvider.validCryptoCurrencies.includes(selectedParams.selectedCryptoCurrency))
    errors.selectedCryptoCurrency = 'Unsupported cryptoCurrency'

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
  return (_req, res, next) => {
    next(done => {
      const { error } = res
      if (!error) {
        return done()
      }
      serializeError(error)
      log.error(`MetaMask - RPC Error: ${error.message}`, error)
      done()
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
export const logStreamDisconnectWarning = (remoteLabel, err) => {
  let warningMsg = `MetamaskInpageProvider - lost connection to ${remoteLabel}`
  if (err) warningMsg += '\n' + err.stack
  log.warn(warningMsg)
  if (this instanceof EventEmitter || this instanceof SafeEventEmitter) {
    if (this.listenerCount('error') > 0) {
      this.emit('error', warningMsg)
    }
  }
}

/**
 * Adds hidden "then" and "catch" properties to the given object. When returned
 * from a function, the given object will appear unchanged. If, however, the
 * caller expects a Promise, it will behave like a Promise that resolves to
 * the value of the indicated property.
 *
 * @param {Object} obj - The object to make thenable.
 * @param {string} prop - The property whose value the object's then function resolves to.
 * @returns {Object} - The secretly thenable object.
 */
export const makeThenable = (obj, prop) => {
  // don't do anything to Promises
  if (obj instanceof Promise) return obj

  const defineOpts = {
    configurable: true,
    writable: true,
    enumerable: false
  }

  // strange wrapping of Promise functions to fully emulate .then behavior,
  // specifically Promise chaining
  // there may be a simpler way of doing it, but this works
  const thenFunction = (consumerResolve, consumerCatch) => {
    return Promise.resolve().then(() => consumerResolve(obj[prop]), consumerCatch)
  }

  Object.defineProperty(obj, 'then', { ...defineOpts, value: thenFunction })

  // the Promise will never fail in our usage, so just make a no-op "catch"
  Object.defineProperty(obj, 'catch', { ...defineOpts, value: Promise.prototype.catch })

  Object.defineProperty(obj, 'finally', { ...defineOpts, value: Promise.prototype.finally })

  return obj
}

export const getPreopenInstanceId = () => {
  return randomId()
}
