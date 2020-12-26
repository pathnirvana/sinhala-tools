import axios from "axios"
import cheerio from "cheerio"
import fs from "fs"
import _ from 'lodash'
import jsb from 'json-beautify'

async function fetchHTML(url) {
    const { data } = await axios.get(url)
    return cheerio.load(data)
}
const scrapeYear = '2017' // only 2017 and up years are avialble in this format
const rootFolder = 'silumina/' + scrapeYear + '/index'
if (!fs.existsSync(rootFolder)) fs.mkdirSync(rootFolder, {recursive: true})

const batches = _.range(6).map(i => _.range(10).map(j => i * 10 + j)) // 0-59 in 6 batches

for (const [batchInd, batch] of batches.entries()) {
    console.log(`staring batch ${batchInd}`)
    try {
        await Promise.all(batch.map(async (week) => {
            const weekStr = week < 10 ? '0' + week : week
            const $ = await fetchHTML(`http://www.silumina.lk/date/${scrapeYear}-W${weekStr}?field_section_tid=All`)
            fs.writeFileSync(`${rootFolder}/W${weekStr}.xml`, $.html(), 'utf-8')
            console.log(`got index for week ${weekStr}`)
        }))
    } catch(err) {
        console.log(err.message); // some coding error in handling happened
    }
}