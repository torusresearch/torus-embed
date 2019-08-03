// ==UserScript==
// @name       TORUS USER SCRIPT
// @namespace  http://tor.us
// @version    0.0.2
// @description  dough or donut there is no rye
// @include *
// @copyright  None
// @run-at document-start
// ==/UserScript==
// if ((new URL(window.location.href).searchParams.get('torus')) == 1) {

var whitelist = [
  'etheremon.com',
  'opensea.io',
  'cryptostrikers.com',
  'axieinfinity.com',
  'mlbcryptobaseball.com',
  'mycryptoheroes.net',
  'blockchaincuties.com',
  'cryptokitties.co',
  'mycrypto.com',
  'danfinlay.github.io',
  'myetherwallet.com'
]

var inWhiteList = false
whitelist.map(function(url) {
  if (window.location.hostname.indexOf(url) !== -1) {
    inWhiteList = true
  }
})
if (inWhiteList) {
  var sc = document.createElement('script')
  sc.setAttribute('src', 'https://app.tor.us/embed.min.js')
  // sc.setAttribute('integrity', 'sha384-Liiph4ddXp75cY+hIptxF3HZIq7eZHEI9R9W5NYgHeo5ZzkmgBBAyK8YWIAK0fwZ')
  sc.setAttribute('crossorigin', 'anonymous')
  sc.setAttribute('type', 'text/javascript')
  sc.setAttribute('style-color', '#75b4fd')
  sc.setAttribute('style-position', 'bottom-left')
  sc.setAttribute('style-padding', '8px')
  document.getElementsByTagName('html')[0].appendChild(sc)
}
