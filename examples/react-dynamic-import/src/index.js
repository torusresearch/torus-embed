import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import web3Obj from './helper'

const isTorus = sessionStorage.getItem('pageUsingTorus')

if (isTorus === 'true') {
  import('@toruslabs/torus-embed').then(() => {
    console.log('rehydrated Torus')
    web3Obj.setweb3()
    // set store accounts from here ideally
  })
}

ReactDOM.render(<App />, document.getElementById('root'))
