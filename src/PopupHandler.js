import SafeEventEmitter from 'safe-event-emitter'

import { FEATURES_DEFAULT_POPUP_WINDOW } from './utils'

class PopupHandler extends SafeEventEmitter {
  constructor({ url, target, features }) {
    super()
    this.url = url
    this.target = target || '_blank'
    this.features = features || FEATURES_DEFAULT_POPUP_WINDOW
    this.window = undefined
    this.windowTimer = {}
    this.iClosedWindow = false
    this._setupTimer()
  }

  _setupTimer() {
    this.windowTimer = setInterval(() => {
      if (this.window && this.window.closed) {
        clearInterval(this.windowTimer)
        if (!this.iClosedWindow) {
          this.emit('close')
        }
        this.iClosedWindow = false
        this.window = undefined
      }
      if (this.window === undefined) clearInterval(this.windowTimer)
    }, 500)
  }

  open() {
    this.window = window.open(this.url, this.target, this.features)
  }

  close() {
    this.iClosedWindow = true
    if (this.window) this.window.close()
  }
}

export default PopupHandler
