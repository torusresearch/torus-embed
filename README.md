# Torus Embed — New Frictionless login for Dapps

This module generates the javascript to be included in a dapp via a script tag
It creates an iframe that loads the Torus page, and sets up communication streams between
the iframe and the dapp javascript context.

## Installation

Torus has been designed for gradual adoption from the start. You can use Torus as a web3 provider dynamically (on demand) or by default

<b>Usage: </b>

- As a [script tag](https://gist.github.com/chaitanyapotti/733405286923fa047af4cb26d167acd4)

  Include the script tag into the body of your index.html
  This would include torus by default into the page and will override if other web3 providers are present

- As a package on [npm](https://www.npmjs.com/package/@toruslabs/torus-embed)

  ```
  npm install @toruslabs/torus-embed
  ```

  This approach would ensure that you can

  - use torus only if user agrees to (selecting from a choice of providers)
  - use torus as default if no other web3 providers are present

  Please refer to [examples](examples) folder for details on usage using dynamic import

## Documentation

Torus uses <i>window.sessionStorage</i> to store user details
So, if user reloads the page, all his data would be rehydrated and the user doesn't need to login

These cases are demonstrated in the samples provided in the [examples](examples) folder

## What you need to build your own

Ensure you have a Node.JS development environment setup

```
git clone https://github.com/torusresearch/torus-embed.git
cd torus-embed
npm install
npm run build
```

To run tests

```
npm run test:e2e:headful
npm run test:build-embed
```

Entrypoint: index.js

## License

Torus Embed is MIT Licensed
