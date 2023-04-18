const puppeteer = require('puppeteer')
const axios = require('axios')

const HOST = 'http://ワードプレスのホスト/'
const USER = 'ユーザー名'
const PASS = 'APIのKey'

/**
 * FANZAからジャンル取ってきて、WPに登録.
 */
const main = async () => {
  // ジャンル取得
  const genre = await getGenre()
  // カテゴリー登録
  postCategory(genre)
}

/**
 * FANZAからジャンル取得
 * @returns ジャンル一覧
 */
const getGenre = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  // FANZAジャンル一覧
  await page.goto('https://www.dmm.co.jp/digital/videoa/-/genre/')

  // 18歳確認
  page.click('.ageCheck__link--r18')
  await page.waitForNavigation({ timeout: 60000, waitUntil: "domcontentloaded" })

  // ジャンル一覧取得
  const genre = await page.$$eval('ul.seo-genre-list a > p', list => list.map(data => {
    return data.textContent.trim()
  }).filter(data => {
    // 除外ワードを指定
    return !/期間限定セール/.test(data) ||
      !/スマホ推奨縦動画/.test(data) ||
      !/セット商品/.test(data) ||
      !/その他/.test(data) ||
      !/独占配信/.test(data) ||
      !/FANZA配信限定/.test(data) ||
      !/福袋/.test(data) ||
      !/時間以上作品/.test(data) ||
      !/4K/.test(data) ||
      !/日替わりセール♭/.test(data) ||
      !/％OFF/.test(data)
  }))

  const res = genre
  await browser.close()
  return res
}

/**
 * カテゴリー登録
 * @see https://developer.wordpress.org/rest-api/reference/categories/
 * @param {*} categories 登録するカテゴリー
 */
const postCategory = async (categories) => {
  // await Promise.allは並列となるためNG
  for await (categoryName of categories) {
    // カテゴリーを検索（曖昧検索）
    const res = await axios.get(`${HOST}/wp-json/wp/v2/categories`, { params: { search: categoryName } })
    // カテゴリーを完全一致で検索
    const category = res.data.find((category) => category.name == categoryName)
    if (category) {
      console.log('categoryName', categoryName, 'exists')
      // すでにカテゴリーが存在する場合はスキップする
      continue
    }

    try {
      // カテゴリー登録
      await axios.post(
        `${HOST}/wp-json/wp/v2/categories`,
        {
          'name': categoryName
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          auth: {
            username: USER,
            password: PASS
          }
        }
      )
      console.log('categoryName', categoryName, 'post')
    } catch (error) {
      console.error('categoryName', categoryName, 'error', error.message)
    }
  }
}

main()