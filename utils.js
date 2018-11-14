const fs = require('fs')

exports.isValidFile = (path) => {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        reject(err)
      } else {
        resolve(stats.isFile())
      }
    })
  })
}
