const cheerio = require('cheerio')

const alphaNumericRe = /(^|[\W^.^ ^-])((\w|\.| |-)+)(\s|\S|$)/g
const cjkRe = /[\u4e00-\u9fff]/ // CJK Unified Ideographs
const simpleChinesePunctuationRe = /(。|，|、|？)|(「|《|（)|(」|》|）)/
const chinesePunctuationRe = new RegExp(`(^|\\s|\\S)(${simpleChinesePunctuationRe.toString().slice(1, -1)})(\\s|\\S|$)`, 'g')

function getBeforeNodeLastWord($, node) {
  if (!node.parent) return ''
  return $(node.parent.prev).text().slice(-1) // tricky, used private interface
}

function getAfterNodeFirstWord($, node) {
  if (!node.parent) return ''
  return $(node.parent.next).text().slice(0, 1)
}

function addWhiteSpace(text, $, node) {
  let result = alphaNumericRe.exec(text)
  const modifier = []

  while(result) {
    let [, begin, target, , end] = result
    const beginIndex = result.index + begin.length
    const endIndex = alphaNumericRe.lastIndex - end.length

    alphaNumericRe.lastIndex -= end.length

    if (!begin) {
      begin = getBeforeNodeLastWord($, node)
    }
    if (!end) {
      end = getAfterNodeFirstWord($, node)
    }
    const spaceStart = cjkRe.test(begin)
    const spaceEnd = cjkRe.test(end)

    if (spaceStart || spaceEnd) {
      modifier.push([target, beginIndex, endIndex, spaceStart, spaceEnd])
    }

    result = alphaNumericRe.exec(text)
  }

  while(modifier.length) {
    const [target, begin, end, spaceStart, spaceEnd] = modifier.pop()
    text = `${text.slice(0, begin)}${spaceStart ? ' ' : ''}${target}${spaceEnd ? ' ' : ''}${text.slice(end)}`
  }
  return text
}

function addSpanForPunctuation(text) {
  let result = chinesePunctuationRe.exec(text)
  const modifier = []

  while(result) {
    console.log(result)
    let [target, begin, ,targetNormal, targetOpen, targetClose, end] = result
    const beginIndex = result.index + begin.length
    const endIndex = chinesePunctuationRe.lastIndex - end.length

    chinesePunctuationRe.lastIndex -= end.length

    const isPunctuationAfter = simpleChinesePunctuationRe.test(end)

    if (isPunctuationAfter && target.length > 2) {
      chinesePunctuationRe.lastIndex -= 1
    }

    modifier.push({
      target: targetNormal || targetOpen || targetClose,
      begin: beginIndex,
      end: endIndex,
      type: (function() {
        if (targetNormal) {
          return 'normal'
        } else if (targetOpen) {
          return 'open'
        } else if (targetClose) {
          return 'close'
        }
      }()),
      isPunctuationBefore: simpleChinesePunctuationRe.test(begin),
      isPunctuationAfter,
    })

    result = chinesePunctuationRe.exec(text)
  }

  while(modifier.length) {
    const {target, begin, end, type, isPunctuationBefore, isPunctuationAfter} = modifier.pop()
    text = `${text.slice(0, begin)}<span class="punctuation ppt-${type}\
${isPunctuationAfter ? ' ptt-after' : ''}${isPunctuationBefore ? ' ppt-before' : ''} \
"><span>${target}</span></span>${text.slice(end)}`
  }

  return text
}

function traverseAndReplace($, nodes) {
  nodes.each((idx, parent) => {
    const childNodes = $(parent).contents()
    const tagNodes = childNodes.filter((_, node) => node.type === 'tag')
    const textNodes = childNodes.filter((_, node) => node.type === 'text')
    traverseAndReplace($, tagNodes)
    textNodes.each((_, node) => {
      const text = $(node).text()
      $(node).replaceWith(addSpanForPunctuation(addWhiteSpace(text, $, node), $, node))
    })
  })
}

module.exports = (html) => {
  const $ = cheerio.load(html, {decodeEntities: false})
  traverseAndReplace($, $.root())
  return $.html()
}
