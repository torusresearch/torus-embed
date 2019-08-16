import Web3 from 'web3'
import Torus from '@toruslabs/torus-embed'

const web3Obj = {
  web3: new Web3(),
  setweb3: function(provider) {
    const web3Inst = new Web3(provider)
    web3Obj.web3 = web3Inst
    sessionStorage.setItem('pageUsingTorus', true)
  },
  initialize: async function() {
    const torus = new Torus()
    await torus.init()
    await torus.login()
    web3Obj.setweb3(torus.provider)
  }
}
export default web3Obj
