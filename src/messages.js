export default {
  errors: {
    invalidParams: () =>
      'MetaMask: Invalid request parameters. Please use ethereum.send(method: string, params: Array<any>). ' +
      'For more details, see: https://eips.ethereum.org/EIPS/eip-1193',
    sendSiteMetadata: () => 'MetaMask: Failed to send site metadata. This is an internal error, please report this bug.',
    unsupportedSync: (method) =>
      `MetaMask: The MetaMask Web3 object does not support synchronous methods like ${method} without a callback parameter.`,
  },
  warnings: {
    sendSyncDeprecation:
      'MetaMask: "ethereum.send(...)" will return result-resolving Promises for all methods starting in Q1 2020. ' +
      'For more information, see: https://medium.com/metamask/deprecating-synchronous-provider-methods-82f0edbc874b',
    enableDeprecation:
      'MetaMask: \'"ethereum.enable()" is deprecated and may be removed in the future. ' +
      'Please use "ethereum.send(\'eth_requestAccounts\')" instead. For more information, see: https://eips.ethereum.org/EIPS/eip-1102',
    isConnectedDeprecation:
      'MetaMask: "ethereum.isConnected()" is deprecated and may be removed in the future. ' +
      'Please listen for the relevant events instead. For more information, see: https://eips.ethereum.org/EIPS/eip-1193',
    sendAsyncDeprecation:
      'MetaMask: "ethereum.sendAsync(...)" is deprecated and may be removed in the future. ' +
      'Please use "ethereum.send(method: string, params: Array<any>)" instead. For more information, see: https://eips.ethereum.org/EIPS/eip-1193',
    // misc
    experimentalMethods: 'MetaMask: "ethereum._metamask" exposes non-standard, experimental methods. They may be removed or changed without warning.',
  },
}
