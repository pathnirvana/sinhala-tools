import fs from 'fs'

const tokens = {}, characters = {}, cleanedText = [], cleanedTokens = {}
function addTokens(text) {
    text = text.replace(/[\u200b]/g, '') // this shows up and needs to be removed without a space
    //text = text.replace(/[\*\,\-–…!&;'"‘’“”<>=%•½Ó¼|õø\:\\\/\[\]\+\(\)]/g, ' ') // too many special characters to remove one by one
    text = text.replace(/[^\s\u0d80-\u0dff\dA-Za-z\.\?@\u200d]/g, ' ') // keep . and ? for use later, @emails/numbers are removed below
    text = text.replace(/([\?\.])/g, '$1 ') // add a space if not already present
    
    const words = text.replace(/\s+/g, ' ').split(' ')
        .filter(t => t && !/[@\d]/.test(t)) // remove empty, emails or words with numbers
    words.forEach(t => tokens[t] = tokens[t] ? tokens[t] + 1 : 1)
    totalWords += words.length

    // write words list for word2vec fasttext word embedding models
    const cleaned = words.join(' ').replace(/\u200d/g, '') // remove zwj too
        .toLowerCase().replace(/[\.\?]/g, ' ').replace(/\s+/g, ' ').trim() // after removing .? remove any extra spaces too
    cleaned.replace(/[^\s\u0d80-\u0dffa-z]/g, (m) => console.log(`unwanted char ${m} found in cleaned`)) // error checking
    cleaned.split(' ').forEach(ct => cleanedTokens[ct] = cleanedTokens[ct] ? cleanedTokens[ct] + 1 : 1)
    cleanedText.push(cleaned)
}

let totalArticles = 0, totalWords = 0
function addContents(contents) {
    contents.forEach(content => {
        addTokens(content.title)
        addTokens(content.text)
    })
    totalArticles += contents.length
}
const siluminaYears = ['2017', '2018', '2019', '2020']
siluminaYears.forEach(year => {
    const contents = JSON.parse(fs.readFileSync(`dev/silumina/contents-${year}.json`, 'utf-8'))
    addContents(contents)
})

const adaderanaFiles = [10000, 30000, 50000, 70000, 90000, 110000]
adaderanaFiles.forEach(fileStart => {
    const contents = JSON.parse(fs.readFileSync(`dev/adaderana/contents-${fileStart}-${fileStart + 20000}.json`, 'utf-8'))
    addContents(contents)
})
const mawbimaFiles = [20000, 40000, 60000]
mawbimaFiles.forEach(fileStart => {
    const contents = JSON.parse(fs.readFileSync(`dev/mawbima/contents-${fileStart}-${fileStart + 20000}.json`, 'utf-8'))
    addContents(contents)
})

// todo add the buddhist-books here as well

// compute tokens
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


// writing cleaned text for fasttext - see https://github.com/facebookresearch/fastText/blob/master/wikifil.pl
fs.writeFileSync('cleaned-text.txt', cleanedText.join(' '), 'utf-8')
const cleanedPairs = Object.entries(cleanedTokens).sort((a, b) => b[1] - a[1])
fs.writeFileSync(`cleaned-tokens.txt`, cleanedPairs.map(pair => pair.join(',')).join('\n'), 'utf-8')
console.log(`wrote cleaned text and tokens of size ${cleanedPairs.length}`)

// bigram computation
const bigrams = {}
cleanedPairs.forEach(([ct, freq]) => {
    const syls = []
    ct.replace(/[අ-ෆ][\u0dca-\u0dff]?/g, m => syls.push(m))
    for (let i = 0; i < syls.length - 1; i++) {
        const bg = syls[i] + syls[i+1]
        bigrams[bg] = bigrams[bg] ? bigrams[bg] + freq : freq
    }
})
const bigramPairs = Object.entries(bigrams).sort((a, b) => b[1] - a[1])
fs.writeFileSync(`bigrams.txt`, bigramPairs.map(pair => pair.join(',')).join('\n'), 'utf-8')


/** output from 3 newspapers
#articles: 185184, #words: 40209143. writing 775396 tokens
found 138 distinct characters
wrote cleaned text and tokens of size 688728
*/
