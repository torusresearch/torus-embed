const runOnLoad = fn => {
  if (window.document.body != null) {
    fn()
  } else {
    window.document.addEventListener('DOMContentLoaded', fn)
  }
}

const runOnComplete = fn => {
  var retry = window.setInterval(function() {
    if (window.document.readyState === 'complete') {
      window.clearInterval(retry)
      fn()
    }
  }, 300)
}

const htmlToElement = html => {
  var template = window.document.createElement('template')
  var trimmedHtml = html.trim() // Never return a text node of whitespace as the result
  template.innerHTML = trimmedHtml
  return template.content.firstChild
}

const transformEthAddress = ethAddress => {
  // return ethAddress
  if (Array.isArray(ethAddress)) {
    return ethAddress.map(addr => (typeof addr === 'string' ? addr.toLowerCase() : addr))
  } else if (typeof ethAddress === 'string') {
    return ethAddress.toLowerCase()
  } else {
    throw new Error('Unexpected Ethereum address format')
  }
}

const handleEvent = (handle, eventName, handler, handlerArgs) => {
  const handlerWrapper = () => {
    handler.apply(this, handlerArgs)
    handle.removeEventListener(eventName, handlerWrapper)
  }
  handle.addEventListener(eventName, handlerWrapper)
}

const handleStream = (handle, eventName, handler) => {
  const handlerWrapper = chunk => {
    handler(chunk)
    handle.removeListener(eventName, handlerWrapper)
  }
  handle.on(eventName, handlerWrapper)
}

export { runOnLoad, runOnComplete, htmlToElement, transformEthAddress, handleEvent, handleStream }
