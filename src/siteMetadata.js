import log from './loglevel'
import messages from './messages'

const { errors } = messages

/**
 * Returns whether the given image URL exists
 * @param {string} url - the url of the image
 * @return {Promise<boolean>} whether the image exists
 */
function imgExists(url) {
  return new Promise((resolve, reject) => {
    try {
      const img = document.createElement('img')
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    } catch (e) {
      reject(e)
    }
  })
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
async function getSiteIcon(window) {
  const { document } = window

  // Use the site's favicon if it exists
  let icon = document.querySelector('head > link[rel="shortcut icon"]')
  if (icon && (await imgExists(icon.href))) {
    return icon.href
  }

  // Search through available icons in no particular order
  icon = Array.from(document.querySelectorAll('head > link[rel="icon"]')).find((_icon) => Boolean(_icon.href))
  if (icon && (await imgExists(icon.href))) {
    return icon.href
  }

  return null
}

/**
 * Gets site metadata and returns it
 *
 */
const getSiteMetadata = async () => ({
  name: getSiteName(window),
  icon: await getSiteIcon(window),
})

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
