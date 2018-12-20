const os = require('os')
const path = require('path')

const domain = 'fragment0.com'
const base = process.env.BASE || os.homedir()

module.exports = {
  domain,
  title: 'fragment0',
  url: `https://${domain}`,
  target: path.resolve(base, 'Dropbox', 'fragment0', 'www'),
  static: [
    path.resolve(base, 'Dropbox', 'fragment0', 'org'),
  ],
}
