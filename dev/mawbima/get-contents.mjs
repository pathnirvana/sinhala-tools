import axios from "axios"
import fs from "fs"
import jsb from 'json-beautify'
import cheerio from "cheerio"
import _ from 'lodash'

const startId = 60000, endId = 80000, concurrency = 10
const processMode = 'extract' // or extract

const rootFolder = `dev/mawbima`

if (processMode == 'scrape') {
    if (!fs.existsSync(`${rootFolder}/rawart`)) fs.mkdirSync(`${rootFolder}/rawart`)

    for (let artId = startId; artId < endId; artId += concurrency) {
        // scrape and write to file in batches
        const batch = _.range(artId, artId + concurrency)
        await Promise.all(batch.map(async artId => {
            try {
                const { data } = await axios.get(`https://mawbima.lk/backend/api/News/getSingleNews?Id=${artId}`)
                //console.log(data)
                delete data.data.relatedNewsList

                fs.writeFileSync(`${rootFolder}/rawart/rawart-${artId}.json`, jsb(data.data, null, '\t', 100), 'utf-8')
                console.log(`wrote for ${artId}`)
            } catch (e) {
                throw new Error(`failed to get article id ${artId}: ${e}`)
            }
        }))
    }
    console.log(`finished scraping ${endId - startId} articles`)


} else if (processMode == 'extract') { // process scraped html files to get contents
    
    const contents = _.range(startId, endId)
        .filter(artId => fs.existsSync(`${rootFolder}/rawart/rawart-${artId}.json`))
        .map(artId => {
            const data = JSON.parse(fs.readFileSync(`${rootFolder}/rawart/rawart-${artId}.json`, 'utf-8'))
            if (!data || !data.HTML_Content) {
                console.error(`data not found for ${artId}`)
                return {}
            }
            const $ = cheerio.load(data.HTML_Content)
            const title = data.Title.trim(), 
                date = data.Publish_Date,
                text = $.text(), 
                category = data.Category_Name
            return { title, date, text, artId, category }
    }).filter(({text}) => text && text.length)

    console.log(`writing content for ${contents.length} articles ${startId} to ${endId}`)
    fs.writeFileSync(`${rootFolder}/contents-${startId}-${endId}.json`, jsb(contents, null, '\t', 100), 'utf-8')
}
