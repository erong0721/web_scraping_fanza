const puppeteer = require('puppeteer')
const axios = require('axios')
const fs = require('fs')
const sharp = require('sharp')
const smartcrop = require('smartcrop-sharp')
const { setTimeout } = require('timers/promises')

const get = async (url) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)
  const obj = {}

  console.log('dmm url', url)
  // 18歳確認
  page.click('.ageCheck__link--r18')
  await page.waitForNavigation({ timeout: 60000, waitUntil: "domcontentloaded" })

  // ログイン処理
  const _u = await page.$eval('._n4v1-login-login', item => item.href)
  await page.goto(_u)
  await page.type('input[name="login_id"]', process.env.FANZA_USER)
  await page.type('input[name="password"]', process.env.FANZA_PASS)
  page.click('.btn-login > input[type=submit]')
  // ログインを待つ
  await setTimeout(5000)


  // アフィリエイト用のHTML取得
  try {
    await page.waitForSelector('.c-toolbar__open');
    await setTimeout(1000)
    page.click('.c-toolbar__open')
    await page.waitForSelector('.c-toolbar__nav__item__link');
    await setTimeout(1000)
    page.click('.c-toolbar__nav__item__link')
    await page.waitForSelector('.c-contents__source');
    await setTimeout(1000)
    obj.affiliate = await page.$eval('.c-contents__source', item => item.textContent)
  } catch (error) {
    await page.screenshot({ path: './error.png', fullPage: true });
    throw error
  }

  // タイトル
  obj.title = await page.$eval('#title', item => item.textContent)

  // 説明
  obj.description = await page.$eval('meta[property="og:description"]', item => item.content)

  // 出演者
  try {
    obj.performer = await page.$$eval('#performer > a', list => list.map(data => data.textContent).filter(data => !/すべて/.test(data)))
  } catch (error) {
    console.error(error.message)
    obj.performer = null
  }

  // ジャンル
  try {
    obj.genre = await page.$$eval('#mu > div > table > tbody > tr > td:nth-child(1) > table .nw', async list => {
      return Array.from(list.find(data => /ジャンル/.test(data.textContent)).parentNode.querySelectorAll('a')).map(d => d.textContent)
        .filter(data => {
          return !/すべて/.test(data) &&
            !/ハイビジョン/.test(data) &&
            !/4K/.test(data) &&
            !/独占配信/.test(data) &&
            !/単体作品/.test(data) &&
            !/時間以上/.test(data) &&
            !/妄想族/.test(data) &&
            !/デジモ/.test(data) &&
            !/OFF/.test(data)
        })
    })
  } catch (error) {
    console.error(error)
    obj.genre = null
  }


  // サンプル画像からランダムで取得
  const num = (2 + Math.floor(Math.random() * 6)).toString()
  let img = await page.$eval(`#sample-image${num} > img`, item => item.src)
  img = img.replace(`-${num}.jpg`, `jp-${num}.jpg`)
  const unique = new Date().getTime().toString(16) + Math.floor(1000 * Math.random()).toString(16)
  obj.img = `./img/${unique}.jpg`
  const res = await axios.get(img, { responseType: 'arraybuffer' })
  fs.writeFileSync(obj.img, new Buffer.from(res.data), 'binary')
  // リサイズ
  await resizeImg(obj.img)

  await browser.close()

  return obj
}

const resizeImg = async (img) => {
  const width = 600
  const height = 450
  const body = fs.readFileSync(img);
  const result = await smartcrop.crop(body, { width: width, height: height })
  const crop = result.topCrop;
  sharp(body)
    .extract({ width: crop.width, height: crop.height, left: crop.x, top: crop.y })
    .resize(width, height)
    .toFile(img);
}

module.exports = get