import { ChannelProvider } from '@connext/channel-provider'

import TorusChannelRpcConnection from './channel-rpc-connection'

class TorusChannelProvider extends ChannelProvider {
  constructor(connectionStream) {
    const connection = new TorusChannelRpcConnection(connectionStream)
    super(connection)
    this.isTorus = true
  }
}

export default TorusChannelProvider
