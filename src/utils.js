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
