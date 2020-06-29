import log from './loglevel'
import messages from './messages'

const { errors } = messages

/**
 * Returns whether the given resource exists
 * @param {string} url the url of the resource
 */
const resourceExists = (url) => {
  return fetch(url, { method: 'HEAD', mode: 'same-origin' })
    .then((res) => res.status === 200)
    .catch((_) => false)
}

/**
 * Extracts a name for the site from the DOM
 */
const getSiteName = (window) => {
  const { document } = window

  const siteName = document.querySelector('head > meta[property="og:site_name"]')
  if (siteName) {
    return siteName.content
  }

  const metaTitle = document.querySelector('head > meta[name="title"]')
  if (metaTitle) {
    return metaTitle.content
  }

  if (document.title && document.title.length > 0) {
    return document.title
  }

  return window.location.hostname
}

/**
 * Extracts an icon for the site from the DOM
 */
const getSiteIcon = async (window) => {
  const { document } = window

  // Use the site's favicon if it exists
  let icon = document.querySelector('head > link[rel="shortcut icon"]')
  if (icon && (await resourceExists(icon.href))) {
    return icon.href
  }

  // Search through available icons in no particular order
  icon = Array.from(document.querySelectorAll('head > link[rel="icon"]')).find((x) => Boolean(x.href))
  if (icon && (await resourceExists(icon.href))) {
    return icon.href
  }

  return null
}

/**
 * Gets site metadata and returns it
 *
 */
const getSiteMetadata = async () => {
  return {
    name: getSiteName(window),
    icon: await getSiteIcon(window),
  }
}

/**
 * Sends site metadata over an RPC request.
 */
export const sendSiteMetadata = async (engine) => {
  try {
    const domainMetadata = await getSiteMetadata()
    // call engine.handle directly to avoid normal RPC request handling
    engine.handle(
      {
        method: 'wallet_sendDomainMetadata',
        domainMetadata,
      },
      () => {}
    )
  } catch (error) {
    log.error({
      message: errors.sendSiteMetadata(),
      originalError: error,
    })
  }
}
