const fs = require('fs')
const cheerio = require('cheerio')
const isSVG = require('is-svg')
const uniq = require('lodash.uniq')
const compact = require('lodash.compact')
const chroma = require('chroma-js')
const css = require('css')
const hexy = /^#[0-9a-f]{3,6}$/i

function isColorString(str) {
  if (!str) return false
  if (str === 'none') return false
  return (str.length === 4 || str.length === 7) && str.match(hexy)
}

function color(str) {
  return isColorString(str) ? chroma(str) : null
}

module.exports = function getSvgColors(input, options) {

  if (!isSVG(input)) {
    input = fs.readFileSync(input, 'utf8')
  }

  const $ = cheerio.load(input)

  // Find elements with a `fill` attribute
  var fills = $('[fill]').map(function (i, el) {
    return color($(this).attr('fill'))
  }).get()

  // Find elements with a `stroke` attribute
  var strokes = $('[stroke]').map(function (i, el) {
    return color($(this).attr('stroke'))
  }).get()

  // Find elements with a `stop-color` attribute (gradients)
  var stops = $('[stop-color]').map(function (i, el) {
    return color($(this).attr('stop-color'))
  }).get()

  // Find `fill`, `stroke` and `stops` within inline styles
  $('[style]').each(function (i, el) {
    fills.push(color($(this).css('fill')))
    strokes.push(color($(this).css('stroke')))
    stops.push(color($(this).css('stop-color')))
  })
  
  // Find `fill`, `stroke` and `stops` within embedded stylesheets
  $('style').each(function (i, el) {
    const ast = css.parse($(this).text())
    ast.stylesheet.rules.forEach(rule => {
      rule.declarations.forEach(declaration => {
        if (declaration.property === 'fill') {
          fills.push(color(declaration.value))
        } else if (declaration.property === 'stroke') {
          strokes.push(color(declaration.value))
        } else if (declaration.property === 'stop-color') {
          stops.push(color(declaration.value))
        }
      })
    })
  })

  if (options && options.flat) {
    return compact(uniq(fills.concat(strokes).concat(stops)))
  }

  return {
    fills: compact(uniq(fills)),
    strokes: compact(uniq(strokes)),
    stops: compact(uniq(stops))
  }

}
