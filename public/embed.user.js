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
  // sc.setAttribute('integrity', 'sha384-u3HBAg5/bd3zwT9niaLcJYifAqGEyKOxQFM4zOicDXQktZm+f/LJVO3eRx1c8azk')
  sc.setAttribute('crossorigin', 'anonymous')
  sc.setAttribute('type', 'text/javascript')
  sc.setAttribute('style-color', '#75b4fd')
  sc.setAttribute('style-position', 'bottom-left')
  sc.setAttribute('style-padding', '8px')
  document.getElementsByTagName('html')[0].appendChild(sc)
}
