import axios from "axios"
import cheerio from "cheerio"
import fs from "fs"
import jsb from 'json-beautify'
import _ from 'lodash'

async function fetchHTML(url) {
    const { data } = await axios.get(url)
    return cheerio.load(data)
}
function isComment(index, node) { // remove comments in html
    return node.type === 'comment'
}

const startId = 110000, endId = 130000, concurrency = 10
const processMode = 'extract' // or extract

const rootFolder = `dev/adaderana`

if (processMode == 'scrape') {
    if (!fs.existsSync(`${rootFolder}/rawart`)) fs.mkdirSync(`${rootFolder}/rawart`)

    for (let artId = startId; artId < endId; artId += concurrency) {
        // scrape and write to file in batches
        const batch = _.range(artId, artId + concurrency)
        await Promise.all(batch.map(async artId => {
            try {
                const $ = await fetchHTML(`http://sinhala.adaderana.lk/news.php?nid=${artId}`)

                $('div.advert,div.bookmarkIcon,div.news-banner,div.fb-like').remove()
                $('article.news').contents().filter(isComment).remove() // remove html comments
                fs.writeFileSync(`${rootFolder}/rawart/rawart-${artId}.xml`, cheerio.html($('article.news')), 'utf-8')
                console.log(`wrote for ${artId}`)
            } catch (e) {
                throw new Error(`failed to get article id ${artId}: ${e}`)
            }
        }))
    }
    console.log(`finished scraping ${endId - startId} articles`)


} else if (processMode == 'extract') { // process scraped html files to get contents
    //.filter(artId => fs.existsSync(`${rootFolder}/rawart/rawart-${artId}.xml`))
    const contents = _.range(startId, endId).map(artId => {
            const $ = cheerio.load(fs.readFileSync(`${rootFolder}/rawart/rawart-${artId}.xml`, 'utf-8'))
            const title = $('h1.news-heading').text().trim(), 
                dateStr = $('p.news-datestamp').text().trim().replace(/\s+/g, ' '),
                text = $('div.news-content').text().trim()
            return { title, dateStr, text, artId }
    }).filter(({text}) => text.length)

    console.log(`writing content for ${contents.length} articles ${startId} to ${endId}`)
    fs.writeFileSync(`${rootFolder}/contents-${startId}-${endId}.json`, jsb(contents, null, '\t', 100), 'utf-8')
}
