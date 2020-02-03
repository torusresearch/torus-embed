import Web3 from 'web3'
import Torus from '@toruslabs/torus-embed'

declare const window: any

const web3Obj = {
  web3: new Web3(),
  setWeb3(provider) {
    let web3Instance = new Web3(provider)
    web3Obj.web3 = web3Instance
    sessionStorage.setItem('pageUsingTorus', 'true')
  },
  async initialize(env) {
    let torus = new Torus({ buttonPosition: 'bottom-left' })
    await torus.init({ showTorusButton: true, buildEnv: env || 'production' })
    await torus.login({})
    web3Obj.setWeb3(torus.provider)
    window.torus = torus
  }
}

export default web3Obj
