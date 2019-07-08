import Web3 from 'web3'

const web3Obj = {
  web3: new Web3(),
  setweb3: function() {
    const web3Inst = new Web3(window.web3.currentProvider || 'ws://localhost:8546', null, {})
    web3Obj.web3 = web3Inst
    sessionStorage.setItem('pageUsingTorus', 'true')
  }
}

export default web3Obj
