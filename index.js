require('dotenv').config()
const get = require('./fanza')

const main = async () => {
  const res = await get('https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=pppd00993/')
  console.log(res)
}

main()