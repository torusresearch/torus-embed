import Sentry from '@toruslabs/loglevel-sentry'
import loglevel from 'loglevel'

const logger = loglevel.getLogger('torus-embed')

export const sentry = new Sentry({
  dsn: 'https://47ecd03e5f3e48f5a2eda8d720904263@o503538.ingest.sentry.io/5597799',
  release: process.env.SENTRY_RELEASE,
  sampleRate: 0.5,
})
sentry.install(logger)

export default logger
