# Torus Embed — New Frictionless login for Dapps

[![npm version](https://badge.fury.io/js/%40toruslabs%2Ftorus-embed.svg)](https://badge.fury.io/js/%40toruslabs%2Ftorus-embed)
![npm](https://img.shields.io/npm/dw/@toruslabs/torus-embed)

This module generates the javascript to include in a DApp via a script tag.
It creates an iframe that loads the Torus page and sets up communication streams between
the iframe and the DApp javascript context.

Please refer to docs for API Reference available [here](https://docs.tor.us/developers/api-reference) or [change log](https://docs.tor.us/features/changelog).

## Installation

Torus is meant for gradual adoption from the start. You can use Torus as a `web3` provider dynamically (on demand) or by default.

- As a [script tag](https://gist.github.com/chaitanyapotti/733405286923fa047af4cb26d167acd4)

  Include the script tag into the body of your `index.html`, this will include `torus` into the page and override any other web3 providers that are present.

- As a package on [npm](https://www.npmjs.com/package/@toruslabs/torus-embed)
  ```
  npm install @toruslabs/torus-embed
  ```

  This approach would ensure that you can,
  - use torus only if the user agrees to (by selecting from a choice of providers).
  - use torus by default if no other `web3` providers are present.

  Please refer to the [examples](examples) folder for details on usage using dynamic import.

## Rehydration

Torus uses `window.sessionStorage` to store user details.

So, if the user reloads the page, all his data would be rehydrated and the user doesn't need to log in.

The samples provided in the [examples](examples) folder illustrate the above case.

## Build

Ensure you have a `Node.JS` development environment setup:
```
git clone https://github.com/torusresearch/torus-embed.git
cd torus-embed
npm install
npm run build
```

To run tests:
```
npm run test:e2e:headful
npm run test:build-embed
```

entry-point: `index.js`

## Requirements

- Node 10+

## License
`torus-embed` is [MIT Licensed](LICENSE)
