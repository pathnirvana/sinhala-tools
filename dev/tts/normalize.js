/**
 * Normalize sinhala text by speaking out numbers, dates and currency symbols 
 * few common abbraviations are also included 
 * No effort has been taken make an exhaustive list of rules that cover all cases - which even might be impossible
 * 
 * Copyright Path Nirvana (pathnirvana@gmail.com) 2021
 */

const regEscape = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const abbra = { // should have a space or a . after for these abbr to apply
    'දු.ක': 'දුරකථන',
    'පො.ප': 'පොලිස් පරීක්ෂක',
    'පො.සැ': 'පොලිස් සැරයන්',
    '+': 'ධන', // english plus would be more generally applicable - google tts uses ධන too
    //සා.පෙළ උ.පෙළ
}
const abbrRegex = new RegExp(`(${Object.keys(abbra).map(k => regEscape(k)).join('|')})([\. ])`, 'g')

//const numPattern = '(\d[\d,]*\d|\d)(?:\.(\d+))?' 
const numberRegex = /(\d[\d,]*\d|\d)(?:\.(\d+))?/g
const percentRegex = new RegExp(numberRegex.source + '%', 'g')
const rsBeginRegex = new RegExp(`(රු|රුපියල්|rs|Rs)\\.? ?${numberRegex.source}`, 'g')
const rsEndRegex = new RegExp(`${numberRegex.source} ?(rs|Rs)`, 'g')

const numBase = ['බින්දුව', 'එක', 'දෙක', 'තුන', 'හතර', 'පහ', 'හය', 'හත', 'අට', 'නවය', 'දහය', 'එකොළහ', 'දොළහ', 'දහතුන', 'දාහතර', 'පහළොව', 'දහසය', 'දහහත', 'දහඅට', 'දහනවය']
const numBaseX = ['', 'එක්', 'දෙ', 'තුන්', 'හාර', 'පන්', 'හය', 'හත්', 'අට', 'නව', 'දස', 'එකොළොස්', 'දොළොස්', 'දහතුන්', 'දාහතර', 'පහළොස්', 'දහසය', 'දහහත්', 'දහඅට', 'දහනව']
const num10 = ['', '', 'විස්ස', 'තිහ', 'හතලිහ', 'පනහ', 'හැට', 'හැත්තෑව', 'අසූව', 'අනූව']
const num10X = ['', '', 'විසි', 'තිස්', 'හතලිස්', 'පනස්', 'හැට', 'හැත්තෑ', 'අසූ', 'අනූ']
const bigUnits = ['', 'කෝටි', 'ප්‍රකෝටි', 'කෝටිප්‍රකෝටි', 'නහුත', 'නින්නහුත', 'අක්ෂෝභිණි', 'බින්දු', 'අබ්බුද', 'නිරබ්බුද', 'අහහය', 'අබබ', 'අටට', 'සෝගන්ධික', 'උප්පල', 'කුමුද', 'පුණ්ඩරික', 'පදුම', 'කථාන', 'මහාකථාන', 'අසංබෙය්‍ය']

function getNum100(num, isCont) { 
    if (num < 20) return isCont ? numBaseX[num] : numBase[num]
    const pow10 = Math.floor(num / 10), remainder = num % 10
    if (remainder) return num10X[pow10] + ' ' + (isCont ? numBaseX[remainder] : numBase[remainder])
    return isCont ? num10X[pow10] : num10[pow10]
}
function getNum1000(num, isCont) { //6 siya 7(10X) 8(base)
    if (num < 100) return getNum100(num, isCont)
    const pow100 = Math.floor(num / 100), remainder = num % 100
    return (pow100 != 1 ? numBaseX[pow100] : (remainder ? 'එක' : '')) + // need special handling for එකසිය(101) and සීය(100)
        ((remainder || isCont) ? 'සිය ' : 'සීය') + 
        (remainder ? getNum100(remainder, isCont) : '')
}
function getNum105(num, isCont) {
    if (num < 1000) return getNum1000(num, isCont)
    const pow1000 = Math.floor(num / 1000), remainder = num % 1000
    return getNum100(pow1000, true) +
        ((remainder || isCont) ? 'දහස් ' : 'දහස') + 
        (remainder ? getNum1000(remainder, isCont) : '')
}
function getNum107(num, isCont) {
    if (num < 100000) return getNum105(num, isCont)
    const pow105 = Math.floor(num / 100000), remainder = num % 100000
    return getNum100(pow105, true) +
        ((remainder || isCont) ? 'ලක්ෂ ' : 'ලක්ෂය') + 
        (remainder ? getNum105(remainder, isCont) : '')
}

function readOnebyOne(text) {
    return text.split('').map(n => numBase[n]).join('යි ')
}
function normalizeNumber(whole, fraction = '', isCont = false) {
    const fracStr = fraction ? 'යි දශම ' + readOnebyOne(fraction) : ''
    if (whole.startsWith('0') && whole.length > 3) return readOnebyOne(whole) + fracStr //&& !/,/.test(whole) && !fraction && whole.length > 7 && whole.length < 12

    whole = whole.replace(/,/g, '')
    const chunks = []
    for (let i = 0; i <= Math.floor(whole.length / 7); i++) { // max possible number 10^147 - 1
        const chunk = Number(whole.slice(-7 * (i + 1), -7 * i || undefined))
        //console.log(chunk)
        if (chunk) chunks.push(getNum107(chunk, i > 0 || isCont) + bigUnits[i] + (chunks.length || !i ? '' : 'ය'))
    }
    return chunks.reverse().join(' ') + fracStr
}

// rupees with cents (ru xxxx.xx)
function getCurrency(p1, p2) { // todo add handlers for other currencies such as usd
    return 'රුපියල් ' + normalizeNumber(p1) + (p2 ? 'යි ශත ' + normalizeNumber(p2) : '')
}

const monthNames = ['ජනවාරී', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජුනි', 'ජුලී', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝම්බර්', 'නොවැම්බර්', 'දෙසැම්බර්']
function normalizeDate(year, month, date) {
    const mN = Number(month), dN = Number(date)
    if (!mN || mN < 1 || mN > 12) return false
    if (!dN || dN < 1 || dN > 31) return false
    return `${normalizeNumber(year)} වර්ෂයේ ${monthNames[mN - 1]} ${normalizeNumber(date)}`
}

function normalizeText(text) {
    text = text.replace(abbrRegex, (m, p1, p2) => abbra[p1] + p2)
    
    text = text.replace(rsBeginRegex, (m, prs, p1, p2) => getCurrency(p1, p2)) 
    text = text.replace(rsEndRegex, (m, p1, p2, prs) => getCurrency(p1, p2))
    
    text = text.replace(/(\d{2,4})[-\/\.]([01]?\d)[-\/\.]([0123]?\d)/g, (match, y, m, d) => normalizeDate(y, m, d) || match) // -/. supported as separators
    text = text.replace(/(\d+) ?- ?(\d+)/g, (m, n1, n2) => normalizeNumber(n1) + ' සිට ' + normalizeNumber(n2)) // රින or minus is not common in tts applications
    // todo add time xx:xx format with am/pm පෙ.ව. ප.ව.
    
    // todo දී should get ඒ added
    text = text.replace(percentRegex, (m, p1, p2) => 'සියයට ' + normalizeNumber(p1, p2)) // percentages num% - සියයට අසූවක්
    // වැනිදා වැනි වන දෙනකුට දෙනා should get X form. (todo except for 4 and 5 10 should get හතර and පස් දහ instead)
    text = text.replace(/(^| )(\d+) ?(වැනි|වෙනි|වන|දෙනකු|දෙනා|දෙනෙ)/g, (m, b, p1, p2) => b + normalizeNumber(p1, '', true) + ' ' + p2) 

    text = text.replace(/([\+-])(\d)/g, (m, p1, p2) => (p1 == '+' ? 'ධන' : 'ඍන') + ' ' + p2) // +- with numbers (todo add x % = in future as necessary)
    text = text.replace(numberRegex, (m, p1, p2) => normalizeNumber(p1, p2))
    return text
}

module.exports = normalizeText

/**
 * test cases
 */ 
const testStr = [
    ['345 45.3 999.01 900 20 120, -1.2 +4', 'තුන්සිය හතලිස් පහ හතලිස් පහයි දශම තුන නවසිය අනූ නවයයි දශම බින්දුවයි එක නවසීය විස්ස එකසිය විස්ස, ඍන එකයි දශම දෙක ධන හතර'],
    ['763,8827399,2837949,8300293', 'හත්සිය හැට තුන්කෝටිප්‍රකෝටි අසූ අටලක්ෂ විසි හත්දහස් තුන්සිය අනූ නවප්‍රකෝටි විසි අටලක්ෂ තිස් හත්දහස් නවසිය හතලිස් නවකෝටි අසූ තුන්ලක්ෂ දෙසිය අනූ තුන'],
    ['දු.ක 083782983 අමතන්න.', 'දුරකථන බින්දුවයි අටයි තුනයි හතයි අටයි දෙකයි නවයයි අටයි තුන අමතන්න.'],
    ['කම්කරු වැටුප රුපියල් 123,564.50 දක්වා', 'කම්කරු වැටුප රුපියල් එක්ලක්ෂ විසි තුන්දහස් පන්සිය හැට හතරයි ශත පනහ දක්වා'],
    ['රු 564.45', 'රුපියල් පන්සිය හැට හතරයි ශත හතලිස් පහ'],
    ['456-783 දක්වා', 'හාරසිය පනස් හය සිට හත්සිය අසූ තුන දක්වා'],
    ['234.532 හා 6732454', 'දෙසිය තිස් හතරයි දශම පහයි තුනයි දෙක හා හැට හත්ලක්ෂ තිස් දෙදහස් හාරසිය පනස් හතර'],
    ['2020-02-30 2030/34/22 1567.12.1', 'දෙදහස් විස්ස වර්ෂයේ පෙබරවාරි තිහ දෙදහස් තිහ/තිස් හතර/විසි දෙක එක්දහස් පන්සිය හැට හත වර්ෂයේ දෙසැම්බර් එක'],
    ['70.2% ක් වැඩිවේ', 'සියයට හැත්තෑවයි දශම දෙක ක් වැඩිවේ'],
    ['10 වෙනිදා 5 දෙනෙක්', 'දස වෙනිදා පන් දෙනෙක්'],
    ['1,000,000 : 1,000,000,000 : 10,0000000,0000000 : 1,000,001 : 100', 'දසලක්ෂය : සිය කෝටිය : දසප්‍රකෝටිය : දසලක්ෂ එක : සීය']
]

testStr.forEach(([ts, exp]) => {
    const res = normalizeText(ts)
    if (res != exp) console.error(`test failed for ${ts}:\n\texp: ${exp}\n\tgot: ${res}`)
})
