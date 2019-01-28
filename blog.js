const fs = require('fs')
const yaml = require('js-yaml')
const nunjucks = require('nunjucks')
const padStart = require('lodash/padStart') // @TODO remove when String.prototype.padStart available
const cheerio = require('cheerio')

const config = require('./config')
const bisheng = require('./bisheng')

const env = nunjucks.configure('source', {
  noCache: process.env.NODE_ENV !== 'production',
})

env.addFilter('simpledate', (str) => {
  const date = new Date(str)
  return `${date.getFullYear()}.${padStart(date.getMonth() + 1, 2, '0')}.${padStart(date.getDate(), 2, '0')}`
})

// bisheng
const bishengRe = /(^|[\W^.^ ^-])((\w|\.| |-)+)(\s|\S|$)/g
const cjkRe = /[\u4e00-\u9fff]/ // CJK Unified Ideographs

const getBeforeNodeLastWord = ($, node) => {
  if (!node.parent) return ''
  return $(node.parent.prev).text().slice(-1) // tricky, used private interface
}

const getAfterNodeFirstWord = ($, node) => {
  if (!node.parent) return ''
  return $(node.parent.next).text().slice(0, 1)
}

const traverseToTextNode = ($, nodes) => {
  nodes.each((idx, parent) => {
    traverseToTextNode($, $(parent).contents().filter((i, node) =>
      node.type === 'tag'))
    $(parent).contents().filter((i, node) => node.type === 'text').each((i, item) => {
      let text = $(item).text()

      const modifier = []
      let result = bishengRe.exec(text)

      while (result) {
        let [, begin, target, , end] = result // eslint-disable-line prefer-const
        const beginIndex = result.index + begin.length
        const endIndex = bishengRe.lastIndex - end.length

        bishengRe.lastIndex -= end.length

        if (!begin) {
          begin = getBeforeNodeLastWord($, item)
        }
        if (!end) {
          end = getAfterNodeFirstWord($, item)
        }

        const spaceStart = cjkRe.test(begin)
        const spaceEnd = cjkRe.test(end)

        if (spaceStart || spaceEnd) {
          modifier.push([target, beginIndex, endIndex, spaceStart, spaceEnd])
        }

        result = bishengRe.exec(text)
      }

      while (modifier.length) {
        const [target, begin, end, spaceStart, spaceEnd] = modifier.pop()
        text = `${text.slice(0, begin)}${spaceStart ? ' ' : ''}${target}${spaceEnd ? ' ' : ''}${text.slice(end)}`
      }

      $(item).replaceWith(text)
    })
  })
}

env.addFilter('bisheng', (str) => {
  return bisheng(str)

  const $ = cheerio.load(str, {decodeEntities: false})
  traverseToTextNode($, $.root())
  return $.html()
})

// end bisheng

function parseArticle(data) {
  const r = data.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/)
  if (!r) {
    throw new Error('InValid Article')
  }
  const [, metadata, body] = r
  const metaConfig = yaml.load(metadata)
  return [metaConfig, body]
}

exports.article = (fpath, url) => {
  return new Promise((resolve, reject) => {
    fs.readFile(fpath, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      try {
        const [meta, body] = parseArticle(data.toString())
        meta.url = url
        resolve(nunjucks.render('article.html', {
          body,
          meta,
          config,
        }))
      } catch (e) {
        reject(e)
      }
    })
  })
}

exports.list = (fpath, url) => {
  return new Promise((resolve, reject) => {
    fs.readFile(fpath, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(nunjucks.render('list.html', {
        config,
        meta: Object.assign({}, yaml.load(data), {url}),
      }))
    })
  })
}

exports.archive = () => {
  return new Promise((resolve) => {
    resolve(nunjucks.render('list.html', {
      config,
      meta: {
        title: 'Archive',
        links: [{
          title: '2018 Note',
          url: '/note',
          absolute: true,
        }, {
          title: '2018 Read',
          url: '/read',
          absolute: true,
        }]
      },
    }))
  })
}

exports.simple = (fname) => {
  return nunjucks.render(fname, {config})
}
