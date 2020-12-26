import axios from "axios"
import cheerio from "cheerio"
import fs from "fs"
import jsb from 'json-beautify'
import _ from 'lodash'

async function fetchHTML(url) {
  const { data } = await axios.get(url)
  return cheerio.load(data)
}

const year = '2017'
const processMode = 'extract' // or extract

const rootFolder = `silumina/${year}`
const contentsAr = []
if (!fs.existsSync(`${rootFolder}/rawart`)) fs.mkdirSync(`${rootFolder}/rawart`)

for (let week = 0; week < 60; week++) {
    await processWeek(week)
}

function createBatches(arr, batchSize) {
    const chunks = [], n = arr.length
    let i = 0
    while (i < n) {
      chunks.push(arr.slice(i, i += batchSize));
    }
    return chunks;
}

async function processWeek(week) {
    const weekStr = week < 10 ? '0' + week : week,
        indexName = `${rootFolder}/index/W${weekStr}.xml`,
        articlesName = `${rootFolder}/index/articles-W${week}.json`
    if (!fs.existsSync(indexName)) return

    if (processMode == 'scrape') { 
        const $ = cheerio.load(fs.readFileSync(indexName, 'utf-8')), articles = []
        let countArticles = 0

        $('.views-field-title a', '.view-content').each((i, elem) => { // each article
            const link = $(elem).attr('href')
            const m = /^\/(\d{4})\/(\d{2})\/(\d{2})\/(\S+?)\//.exec(link)
            if (!m) { 
                console.error(`malformed link ${decodeURIComponent(link)}`)
            } else {
                articles.push({ week, id: countArticles, link,
                    title: $(elem).text().replace(/\u00ad/g, ''), 
                    date: m.slice(1, 4).join('-'),
                    category: decodeURIComponent(m[4]),
                })
                countArticles++
            }
        })
        console.log(`week ${week} has ${countArticles} articles to scrape`)
        fs.writeFileSync(articlesName, jsb(articles, null, '\t', 100), 'utf-8')

        // scrape and write to file in batches
        const batches = createBatches(articles, 10)

        for (const [batchInd, batch] of batches.entries()) {
            console.log(`starting batch ${batchInd}`)
            await Promise.all(batch.map(async article => {
                const $ = await fetchHTML(`http://www.silumina.lk/${article.link}`)

                $('#content-footer-inside, #comments').remove()
                fs.writeFileSync(`${rootFolder}/rawart/rawart-${weekStr}-${article.id}.xml`, cheerio.html($('#main')), 'utf-8')
                console.log(`wrote for ${weekStr}-${article.id} in batch ${batchInd}`)
            }))   
        }

        console.log(`scraped ${countArticles} articles in ${batches.length} batches`)

    } else if (processMode == 'extract') { // process scraped html files to get contents
        const articles = JSON.parse(fs.readFileSync(articlesName, 'utf-8'))
        contentsAr.push(articles.map(article => {
            const $ = cheerio.load(fs.readFileSync(`${rootFolder}/rawart/rawart-${weekStr}-${article.id}.xml`, 'utf-8'))
            const text = $('.field-type-text-with-summary').text().replace(/\u00ad/g, '')
            delete article.link
            return { ...article, text }
        }))
    }
}

if (processMode == 'extract') {
    const contents = contentsAr.flat()
    console.log(`writing content for ${contents.length} articles`)
    fs.writeFileSync(`${rootFolder}/contents-${year}.json`, jsb(contents, null, '\t', 100), 'utf-8')
}