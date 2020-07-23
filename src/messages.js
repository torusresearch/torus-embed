export default {
  errors: {
    disconnected: () => 'MetaMask: Lost connection to MetaMask background process.',
    sendSiteMetadata: () => 'MetaMask: Failed to send site metadata. This is an internal error, please report this bug.',
    unsupportedSync: (method) =>
      `MetaMask: The MetaMask Web3 object does not support synchronous methods like ${method} without a callback parameter.`,
    invalidDuplexStream: () => 'Must provide a Node.js-style duplex stream.',
    invalidOptions: (maxEventListeners, shouldSendMetadata) =>
      `Invalid options. Received: { maxEventListeners: ${maxEventListeners}, shouldSendMetadata: ${shouldSendMetadata} }`,
  },
  warnings: {
    // deprecated methods
    enableDeprecation:
      'MetaMask: ""ethereum.enable()" is deprecated and may be removed in the future. ' +
      'Please use "ethereum.send("eth_requestAccounts")" instead. For more information, see: https://eips.ethereum.org/EIPS/eip-1102',
    sendDeprecation:
      'MetaMask: "ethereum.send(...)" is deprecated and may be removed in the future.' +
      ' Please use "ethereum.sendAsync(...)" or "ethereum.request(...)" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
    events: {
      chainIdChanged:
        'MetaMask: The event "chainIdChanged" is deprecated and WILL be removed in the future. ' +
        'Please use "chainChanged" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
      close:
        'MetaMask: The event "close" is deprecated and may be removed in the future. Please use "disconnect" instead.' +
        '\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
      data: 'MetaMask: The event "data" is deprecated and may be removed in the future.',
      networkChanged:
        'MetaMask: The event "networkChanged" is deprecated and may be removed in the future.' +
        ' Please use "chainChanged" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
      notification:
        'MetaMask: The event "notification" is deprecated and may be removed in the future. ' +
        'Please use "message" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
    },
    // misc
    experimentalMethods: 'MetaMask: "ethereum._metamask" exposes non-standard, experimental methods. They may be removed or changed without warning.',
    publicConfigStore: 'MetaMask: The property "publicConfigStore" is deprecated and WILL be removed in the future.',
  },
}
