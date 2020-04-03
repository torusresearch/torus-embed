export const runOnLoad = (fn) => {
  return new Promise((resolve, reject) => {
    if (window.document.body != null) {
      Promise.resolve(fn()).then(resolve).catch(reject)
    } else {
      window.document.addEventListener('DOMContentLoaded', () => {
        Promise.resolve(fn()).then(resolve).catch(reject)
      })
    }
  })
}

export const runOnComplete = (fn) => {
  const retry = window.setInterval(() => {
    if (window.document.readyState === 'complete') {
      window.clearInterval(retry)
      fn()
    }
  }, 300)
}

export const htmlToElement = (html) => {
  const template = window.document.createElement('template')
  const trimmedHtml = html.trim() // Never return a text node of whitespace as the result
  template.innerHTML = trimmedHtml
  return template.content.firstChild
}

export const transformEthAddress = (ethAddress) => {
  // return ethAddress
  if (Array.isArray(ethAddress)) {
    return ethAddress.map((addr) => (typeof addr === 'string' ? addr.toLowerCase() : addr))
  }
  if (typeof ethAddress === 'string') {
    return ethAddress.toLowerCase()
  }
  throw new Error('Unexpected Ethereum address format')
}

export const handleEvent = (handle, eventName, handler, handlerArgs) => {
  const handlerWrapper = () => {
    handler(...handlerArgs)
    handle.removeEventListener(eventName, handlerWrapper)
  }
  handle.addEventListener(eventName, handlerWrapper)
}

export const handleStream = (handle, eventName, handler) => {
  const handlerWrapper = (chunk) => {
    handler(chunk)
    handle.removeListener(eventName, handlerWrapper)
  }
  handle.on(eventName, handlerWrapper)
}
