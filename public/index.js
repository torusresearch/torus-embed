const Torus = require('../dist/embed').default

const torus = new Torus()
const buildEnv = process.env.TORUS_BUILD_ENV
torus
  .init({ buildEnv, showTorusButton: false })
  .then(() => {
    window.ethereum = torus.ethereum
    window.Web3 = torus.Web3
    window.torus = torus
    window.web3 = torus.web3
    return undefined
  })
  .catch((err) => console.error(err))
