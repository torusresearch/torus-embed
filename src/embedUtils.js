module.exports = {
  runOnLoad,
  runOnComplete,
  htmlToElement,
  transformEthAddress
}

function runOnLoad(fn) {
  if (window.document.body != null) {
    fn()
  } else {
    window.document.addEventListener('DOMContentLoaded', fn)
  }
}

function runOnComplete(fn) {
  var retry = window.setInterval(function() {
    if (window.document.readyState === 'complete') {
      window.clearInterval(retry)
      fn()
    }
  }, 300)
}

function htmlToElement(html) {
  var template = window.document.createElement('template')
  var trimmedHtml = html.trim() // Never return a text node of whitespace as the result
  template.innerHTML = trimmedHtml
  return template.content.firstChild
}

function transformEthAddress(ethAddress) {
  // return ethAddress
  if (Array.isArray(ethAddress)) {
    return ethAddress.map(addr => (typeof addr === 'string' ? addr.toLowerCase() : addr))
  } else if (typeof ethAddress === 'string') {
    return ethAddress.toLowerCase()
  } else {
    throw new Error('Unexpected Ethereum address format')
  }
}
