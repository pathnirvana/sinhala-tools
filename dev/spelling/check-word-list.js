/**
 * read error checked files for common errors
 * empty: correct word
 * s: suggest not to use the word
 * x: error word
 * 
 * rules
 * each line should have at least 2 non empty words
 * each line should have at least one correct word
 * optional comment can be extracted from the last column
 */
"use strict"

const fs = require('fs')
const path = require('path')
const vkb = require('vkbeautify'), perf = require('perf_hooks').performance
const checkedFilename = 'checked-sheet.txt'
const allowedComments = ['different meaning', 'name of object', 'name of person', 'name of place']
const commentCol = 7 // 0 index of H column

//const ignoreWords = JSON.parse(fs.readFileSync(path.join(__dirname, ignoreFilename), 'utf-8')), replacements = {}
fs.readFileSync(path.join(__dirname, checkedFilename), 'utf-8').split('\n').forEach((line, lineNum) => {
    const cols = line.split('\t'), comment = (cols[commentCol] || '').trim()
    const cells = cols.slice(0, commentCol).filter(c => c.trim()).map(cell => cell.match(/([\u0D80-\u0DFF\u200d ]+)(?:\/(\d+)([sx]?))?/))
    //console.log(cells)
    if (cells.some(m => !m) || !cells[0] || !cells.slice(1)) {
        console.error(`malformed line at row ${lineNum + 1}. line: ${line}`)
        return
    }
    if (cells.every(m => m[3] == 'x' || m[3] == 's')) {
        console.error(`no correct word in row ${lineNum + 1}. line: ${line}`)
    }
    if (comment && allowedComments.indexOf(comment) < 0) console.error(`comment not allowed in row ${lineNum + 1}. comment: ${comment}`)

    // cells.forEach(([_1, word, freq, action]) => {
    //     if (['c', 'm', 'd'].indexOf(action) >= 0) ignoreWords[word] = action
    //     else if (['x'].indexOf(action) >= 0) {
    //         if (replacements[word] && replacements[word].mainWord != mainWord) 
    //             console.error(`replacement for this word ${word} already defined -> ${replacements[word].mainWord}/${mainWord}`)
    //         replacements[word] = { mainWord, freq, done: 0 }
    //     }
    // })    
})

process.exit(0)
if (!dryRun && writeIgnoreList) {
    fs.writeFileSync(path.join(__dirname, newIgnoreFilename), vkb.json(JSON.stringify(ignoreWords)), 'utf-8')
    console.log(`wrote new ignore list with ${Object.keys(ignoreWords).length} words to ${newIgnoreFilename}`)
}

console.log(`needs to do ${Object.keys(replacements).length} replacements from ${checkedFilename}`)

function makeReplacements(data) {
    let modCount = 0
    const replaceFunc = (e) => {
        e.text = e.text.replace(/[\u0D80-\u0DFF\u200d]+/g, (m) => {
            const info = replacements[m]
            if (info) {
                info.done++
                modCount++
                return info.mainWord
            }
            return m
        })
    }
    data.pages.forEach(p => {
        //p.pali.entries.forEach(e => replaceFunc(e))
        p.sinh.entries.forEach(e => replaceFunc(e))
    })
    return modCount
}

const perf1 = perf.now()
const modCounts = processTextFiles(file => !/^atta/.test(file), (data, file) => makeReplacements(data), dryRun)
const considered = Object.keys(modCounts).length, changed = Object.values(modCounts).filter(v => v).length
console.log(`changed ${changed} files out of ${considered} files, in ${perf.now() - perf1} mills`)

Object.entries(replacements).filter(([w, info]) => info.done != info.freq).forEach(([w, info]) => console.log(`${w} freq ${info.freq}, but found ${info.done} places to replace`))
if (!dryRun)
    fs.writeFileSync(path.join(__dirname, '12-done-replacements.json'), vkb.json(JSON.stringify(replacements)), 'utf-8')