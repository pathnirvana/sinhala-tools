"use strict"

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const normalizeText = require('./normalize.js')

// do some newspaper cleanup
const sentences = [], minSentLen = 40, maxSentLen = 200
function addSentence(s) {
    s = s.replace(/[\u200b]/g, '') // this shows up and needs to be removed without a space
    s = s.replace(/[“”‘’"]/g, "'")
    s = s.replace(/[^\s\u0d80-\u0dff\dA-Za-z!'\(\),\-\.:;\?@\u200d]/g, ' ')
    s = s.replace(/\s+/g, ' ').split(' ').filter(t => t && !/[@]/.test(t)).join(' ') // remove empty, and emails
    sentences.push(s)
}

// read all the content files
let totalArticles = 0
function addContents(filename) {
    const articles = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', filename), 'utf-8'))
    articles.forEach(article => {
        addSentence(article.title)
        let start = 0
        article.text.split(/\. /).forEach((s, i, ar) => {
            const curSent = ar.slice(start, i).join('. ') // join few sentences together
            if (curSent.length < minSentLen + Math.random() * (maxSentLen - minSentLen)) return // random number in min max sent length range
            addSentence(curSent)
            start = i + 1
        })
    })
    totalArticles += articles.length
}
const siluminaYears = ['2017', '2018', '2019', '2020']
siluminaYears.forEach(year => addContents(`dev/silumina/contents-${year}.json`))
const adaderanaFiles = [10000, 30000, 50000, 70000, 90000, 110000]
adaderanaFiles.forEach(fileStart => addContents(`dev/adaderana/contents-${fileStart}-${fileStart + 20000}.json`))
const mawbimaFiles = [20000, 40000, 60000]
mawbimaFiles.forEach(fileStart => addContents(`dev/mawbima/contents-${fileStart}-${fileStart + 20000}.json`))
console.log(`considering ${sentences.length} sentences from ${totalArticles} articles`)


// sentences are more easier to speak and record - try to extract some interesting sentences that are not too long or short also has common long words 
const ttsSentences = {}, selectedWCounts = {}
const wordCounts = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../tokens.txt'), 'utf-8').split('\n').map(p => p.split(',')))

const cleanNonSinh = s => s.replace(/[^\u0d82-\u0ddf\u0df2 ]/g, '') // anything non sinhala or space removed - only for word metrics
cleanNonSinh(fs.readFileSync('E:/tts_datasets/sinhala/new-dataset/prompts.txt', 'utf-8').replace(/[\s\u00a0\d\n]+/g, ' ')).split(' ')
    .forEach(w => selectedWCounts[w] = (selectedWCounts[w] || 0) + 1)
console.log(`selected words count in current prompts.txt is ${Object.keys(selectedWCounts).length}`)
const logCount = (w) => Math.max(Math.ceil(Math.log10(wordCounts[w])), 1)

_.shuffle(sentences)
    .map(s => s.trim())
    .filter(s => s.length >= minSentLen && s.length <= maxSentLen) // sentence length filter
    .forEach(s => {
        const sWords = cleanNonSinh(s).split(' ').filter(w => w.length > 2)
        // at least 40% of the words greater than freq 20 and selected less than log(freq) times
        if (sWords.filter(w => wordCounts[w] >= 5 && selectedWCounts[w] < logCount(w)).length < Math.max(4, sWords.length * 0.35)) return
        // lot of words already selected many times - prefer shorter sentences
        if (sWords.filter(w => selectedWCounts[w] > logCount(w)).length >= sWords.length * 0.4) return 
        if (sWords.some(w => wordCounts[w] <= 5)) return // at least one word with small occurance - could be a typo
        // if (sWords.filter(w => wordCounts[w] == 1).length) console.log(sWords)
        if (!ttsSentences[s]) {
            ttsSentences[s] = 1
            sWords.forEach(w => selectedWCounts[w] = (selectedWCounts[w] || 0) + 1)
        }
    })
const sortedSentences = Object.entries(ttsSentences)
    .map(([s, f]) => s)
    .sort((sa, sb) => sa > sb ? 1 : -1) // alphabetical order

const shuffledSentences = _.shuffle(sortedSentences)
const normalizedSentences = shuffledSentences.map(s => normalizeText(s))

fs.writeFileSync(path.join(__dirname, `sentences.txt`), shuffledSentences.join('\n'), 'utf-8')
fs.writeFileSync(path.join(__dirname, `sentences-norm.txt`), normalizedSentences.join('\n'), 'utf-8')
console.log(`wrote ${sortedSentences.length} sentences to sentences.txt`)

