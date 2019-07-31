module.exports = {
  post,
  generateJsonRPCObject,
  getLookupPromise
}

function post(url, data) {
  const options = {
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(data),
    method: 'POST'
  }
  return fetch(url, options).then(response => {
    if (response.ok) {
      return response.json()
    } else throw new Error('Could not connect', response)
  })
}

function generateJsonRPCObject(method, params) {
  return {
    jsonrpc: '2.0',
    method: method,
    id: 10,
    params: params
  }
}

function getLookupPromise(el) {
  return new Promise((resolve, reject) => resolve(el))
}
