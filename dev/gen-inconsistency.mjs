"use strict"

import fs from 'fs'
import path from 'path'
const __dirname = 'dev/'

const words = {}, addedWords = {}
fs.readFileSync(__dirname + 'tokens.txt', 'utf-8').split('\n')
    .map(line => line.split(','))
    .forEach(([word, freq]) => {
        word = word.replace(/[\.\?]$/, '') // remove ending dot or comma
        words[word] = (words[word] || 0) + Number(freq)
    })
console.log(`loaded ${Object.keys(words).length} words from tokens file`)

const propArAdd = (obj, prop, v) => {
    if (obj[prop]) obj[prop].push(v)
    else obj[prop] = [v]
}
const addPairs = (strV, list) => {
    strV.split(',').map(a => a.trim().split(':')).forEach(cpair => {
        propArAdd(list, cpair[0], cpair[1])
        propArAdd(list, cpair[1], cpair[0])
    })
}

function genPerms(word) {
    const matches = [...word.matchAll(variationsRegex)], perms = []
    matches.forEach(m => {
        variations[m[0]].forEach(v =>
            perms.push(word.substr(0, m.index) + v + word.substr(m.index + m[0].length)))
    })
    return perms
}

//const linkSinh = (w, words) => `<a href="https://tipitaka.lk/fts/${w}/1-1-10">${w}</a>/${words[w] ? words[w].freq : 0}`
//const linkPali = (w, words) => linkSinh(w, words) +`/${cst(w)}`
function potentialErrors(outFilename, ignoreWords = {}) {
    const errors = []; let permCount = 0
    
    Object.keys(words).filter(w => words[w] >= mainWordThres && w.length >= lengthThres) 
        .sort((a, b) => words[b] - words[a])
        .forEach(w => {
            if (addedWords[w]) return // a word is added only once as either error or main
            const perms = genPerms(w).filter(p => words[p] && !addedWords[p] && words[p] <= words[w]/freqRatio && words[p] >= 5)
            //if (w == 'කරනවා') console.log(genPerms(w))
            if (perms.length) {
                errors.push([w, perms]);
                [w, ...perms].forEach(a => addedWords[a] = 1)
                permCount += perms.length
            }
        })
    fs.writeFileSync(path.join(__dirname, outFilename), 
         errors.map(([w, perms]) => `${w}/${words[w]}\t` + perms.map(p => `${p}/${words[p]}`).join('\t')).join('\n'),
         'utf-8')
    //const tbody = errors.map(([w, perms], i) => `<td>${i}</td><td>` + [w, ...perms].map(w => getLink(w, words)).join('</td><td>') + '</td>').join('</tr><tr>')
    //writeHtml(tbody, 'common-errors/' + outFilename)
    console.log(`potential visual errors: ${errors.length} main-words, ${permCount} error-words to ${outFilename}`)
}

let mainWordThres = 5, errorWordThres = 100, freqRatio = 2, lengthThres = 4 // for errors
let variations = {}
;['\u0dca', '\u0dcf', '\u0dd0', '\u0dd1', '\u0dd2', '\u0dd3', '\u0dd4', '\u0dd6', '\u0dd8', '\u0dd9', '\u200d'].forEach(dv => variations[dv] = ['']) // delete dept vowel + zwj for sinh
const visualV = 'ජ:ඡ, ච:ව, න:ත, එ:ඵ, එ:ළු, ළු:ඵ, බ:ඛ, ධ:ඨ, ඨ:ඪ, ඊ:ර' // visually close pairs
const indeptVV = '\u0dd0:\u0dd1,\u0dd2:\u0dd3,\u0dd4:\u0dd6,\u0dd9:\u0dda,\u0ddc:\u0ddd'
const extraV =  'එ:ඒ,ඔ:ඕ,ක:ඛ,ග:ඝ,ච:ඡ,ජ:ඣ,ට:ඨ,ඩ:ඪ,ත:ථ,න:ණ,ද:ධ,ප:ඵ,බ:භ,ල:ළ,ශ:ෂ,ස:ඝ,හ:භ,ඤ:ඥ,ද:ඳ,ඩ:ඬ,ඞ:ඩ,ඞ:ඬ,ත:ට,ග:ඟ' // බ:ව removed
const niggahithaV = 'ඞ්:ං, ඤ්:ං, ම්:ං, න්:ං, ඞ්:ඤ්, ඤ්:ම්, ඞ්:ම්, ව්:බ්'
addPairs(visualV, variations)
addPairs(indeptVV, variations)
addPairs(extraV, variations)
addPairs(niggahithaV, variations) // for inconsistencies

let variationsRegex = new RegExp(Object.keys(variations).join('|'), 'g')
//const ignoreWords = JSON.parse(fs.readFileSync(path.join(__dirname, 'pali-ignore.json'), 'utf-8'))

potentialErrors('common-errors-sinh.txt', {})


// function getSinhOEInconsistencies() {
//     const words = readWordList('word-list-sinh.txt'), outFilename = 'ooee-inconsistencies-sinh.txt', errors = []
//     Object.keys(words).filter(w => /[ඔඑ\u0dd9\u0ddc]/.test(w)).forEach(w => {
//         w.replace(/[ඔඑ\u0dd9\u0ddc]/g, (m, i) => {
//             const p = w.substr(0, i) + String.fromCharCode(m.charCodeAt(0) + 1) + w.substr(i + 1)
//             if (words[p]) errors.push([w, p])
//         })
//     })
//     const tbody = errors.map((pair, i) => `<td>${i}</td><td>` + pair.map(w => linkSinh(w, words)).join('</td><td>') + '</td>').join('</tr><tr>')
//     writeHtml(tbody, 'common-errors/' + outFilename)
//     console.log(`potential oe inconsistencies: ${errors.length} to ${outFilename}`)
// }
// getSinhOEInconsistencies()


/**
 * possible rules 
 * english words are added to a separate list
 * 
 * words with freq >= 10 considered correct by default and added to the dict
 * words with freq < 5 are not added to the dict and considered incorrect
 * words with freq between 10 and 5 - manually checked for correctness
 * words with freq >= 5 but matched with the inconsistency list 
 *          marked as wrong - removed
 *          marked as correct - added
 * 
 * english words written in singlish marked separately 
 * 
 * සිංහල අක්ෂර වින්‍යාසය, පද බෙදීම, ව්‍යාකරණ නීති ආදිය ගැන හොඳ දැනුමක් සහ පරිගණක දැනුම ඇති කෙනෙක්ගේ සේවය ඉබේ අක්ෂර වින්‍යාස නිවැරදි වන මෘදුකාංගයක් නිපදවීමේ ව්‍යාපෘතියක් සඳහා අවශ්‍ය වී ඇත.
අයදුම් කිරීම සඳහා පහත ඇති excel sheet එක භාගත කරගෙන එහි ඇති උපදෙස් පරිදි සම්පුර්ණ කර අප වෙත email කරන්න. 
https://www.dropbox.com/s/9nqxpfrr08egmia/
ගෙදර සිටම වැඩ කල හැකිය. වචන 200,000 ක පමණ ලැයිස්තුවක් පරික්ෂා කිරීමට තිබේ. තෙරුවන් සරණයි.
 */