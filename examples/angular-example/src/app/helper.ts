import Web3 from 'web3'
import Torus from '@toruslabs/torus-embed'

const web3Obj = {
  web3: new Web3(),
  torus: new Torus({}),
  setWeb3(provider) {
    let web3Instance = new Web3(provider)
    web3Obj.web3 = web3Instance
  },
  async initialize(env) {
    await web3Obj.torus.init({ showTorusButton: true, buildEnv: env || 'production', network: { host: 'rinkeby' } })
    await web3Obj.torus.login({})
    web3Obj.setWeb3(web3Obj.torus.provider)
    sessionStorage.setItem('pageUsingTorus', env)
  }
}

export default web3Obj
