const fs = require('fs')
const path = require('path')
//const vkbeautify = require('vkbeautify')
const jsdom = require('jsdom');

const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
const $ = jQuery = require('jquery')(window)

const htmlInputDir = 'C:/Users/Janaka/Documents/Webstorm/pitaka/dev/books/input', 
    textOutDir = path.join(__dirname, 'text')
    wordCounts = {}
const cleanNonSinh = s => s.replace(/[^\u0d82-\u0ddf\u0df2 ]/g, '')

fs.readdirSync(htmlInputDir).filter(fn => fn.endsWith('html')).forEach(htmlFilename => {
    const html = fs.readFileSync(path.join(htmlInputDir, htmlFilename), 'utf-8')
    const bookDom = new JSDOM(html);
    const bookDoc = bookDom.window.document;
    const paras = $('p', bookDoc).get().map(_para => $(_para).text())
    const text = paras.join('\n')

    fs.writeFileSync(path.join(textOutDir, htmlFilename.split('.')[0] + '.txt'), text, 'utf-8')
    console.log(`wrote text file of length ${text.length} and ${paras.length} paras for ${htmlFilename}`)
    cleanNonSinh(paras.join(' ')).split(' ').forEach(w => wordCounts[w] = (wordCounts[w] + 1) || 1)
})

fs.writeFileSync(path.join(__dirname, 'word-counts.json'), JSON.stringify(wordCounts), 'utf-8')
console.log(`wrote word counts for ${Object.keys(wordCounts).length} words to word-counts.json`)