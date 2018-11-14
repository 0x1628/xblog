const os = require('os')
const path = require('path')

const domain = 'fragment0.com'

module.exports = {
  domain,
  title: 'fragment0',
  url: `https://${domain}`,
  target: path.resolve(os.homedir(), 'Dropbox', 'fragment0', 'www'),
  static: [
    path.resolve(os.homedir(), 'Dropbox', 'fragment0', 'org'),
  ],
}
