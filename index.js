const axios = require('axios')
const Promise = require('bluebird')

const db = require('knex')({
  client: 'pg',
  connection: process.env.DB_URL,
})

function data() {
  axios
    .get('https://www.deribit.com/api/v1/public/getinstruments')
    .then(r => r.data.result)
    .then(r => {
      return Promise.map(
        r,
        i => {
          return axios
            .get('https://www.deribit.com/api/v1/public/getorderbook', {
              params: { instrument: i.instrumentName },
            })
            .then(r => r.data.result)
            .then(r => {
              return {
                instrument: i.instrumentName,
                bid: r.bids && r.bids[0] ? r.bids[0].price : null,
                ask: r.asks && r.asks[0] ? r.asks[0].price : null,
              }
            })
            .catch(err => {
              console.error(new Error(`${i.instrumentName} ${err.message}`))
              return { instrument: i.instrumentName, bid: null, ask: null }
            })
        },
        { concurrency: 10 },
      )
    })
    .then(r => {
      return db.batchInsert('history', r, 1000)
    })
    .catch(err => console.error(err))
}

data()
setInterval(data, 5 * 60 * 1000)
