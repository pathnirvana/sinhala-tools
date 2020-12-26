import fs from 'fs'

const tokens = {}, characters = {}
function addTokens(text) {
    text = text.replace(/[\u200b]/g, '') // this shows up and needs to be removed without a space
    text = text.replace(/[\*\,\-–…!&;'"‘’“”<>=\:\\\/\[\]\+\(\)]/g, ' ') // keep . and ? for use later
    const words = text.replace(/\s+/g, ' ').split(' ')
        .filter(t => t && t.indexOf('@') < 0 && !/^\d+$/.test(t)) // remove empty, emails or numbers
    words.forEach(t => tokens[t] = tokens[t] ? tokens[t] + 1 : 1)
    totalWords += words.length
}

const siluminaYears = ['2017', '2018', '2019', '2020']
let totalArticles = 0, totalWords = 0
siluminaYears.forEach(year => {
    const contents = JSON.parse(fs.readFileSync(`dev/silumina/contents-${year}.json`, 'utf-8'))
    contents.forEach(content => {
        addTokens(content.title)
        addTokens(content.text)
    })
    totalArticles += contents.length
})

const pairs = Object.entries(tokens).sort((a, b) => b[1] - a[1])
console.log(`#articles: ${totalArticles}, #words: ${totalWords}. writing ${pairs.length} tokens`)
fs.writeFileSync(`tokens.txt`, pairs.map(pair => pair.join(',')).join('\n'), 'utf-8')

// compute char frequencies
const specialSeq = { 
    'ර\u0dca\u200d': 'α',
	'\u0dca\u200dර': 'β',
	'\u0dca\u200dය': 'γ',
}, seqRegex = new RegExp(Object.keys(specialSeq).join('|'), 'g')
pairs.forEach(([word, freq]) => {
    word = word.replace(seqRegex, (m) => specialSeq[m])
    word.split('').forEach(c => characters[c] = characters[c] ? characters[c] + freq : freq)
})
const charPairs = Object.entries(characters).sort((a, b) => b[1] - a[1]), 
    totalFreq = charPairs.reduce((sum, p) => sum += p[1], 0)
console.log(`found ${charPairs.length} distinct characters`)
fs.writeFileSync(`characters.txt`, charPairs.map(pair => pair.join(',') + ',' + pair[1] * 100 / totalFreq).join('\n'), 'utf-8')