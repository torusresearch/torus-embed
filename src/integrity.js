import createHash from 'create-hash/browser'

const defaults = (options) => ({
  algorithms: options.algorithms || ['sha256'],
  delimiter: options.delimiter || ' ',
  full: options.full || false,
})

// Generate hash
const digest = (algorithm, data) => createHash(algorithm).update(data, 'utf8').digest('base64')
// Generate list of hashes
const hashes = (options, data) => {
  const internalHashes = {}
  options.algorithms.forEach((algorithm) => {
    internalHashes[algorithm] = digest(algorithm, data)
  })
  return internalHashes
}
// Build an integrity string
const integrity = (options, sri) => {
  let output = ''

  // Hash list
  output += Object.keys(sri.hashes)
    .map((algorithm) => `${algorithm}-${sri.hashes[algorithm]}`)
    .join(options.delimiter)

  return output
}

const main = (options, data) => {
  // Defaults
  const finalOptions = defaults(options)

  const sri = {
    hashes: hashes(finalOptions, data),
    integrity: undefined,
  }
  sri.integrity = integrity(finalOptions, sri)

  return finalOptions.full ? sri : sri.integrity
}

export default main
