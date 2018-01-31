let http = require('../http');

let TICKER_URL = 'https://api.coinmarketcap.com/v1/ticker/';

module.exports = {
	updateTickers: async function() {
		return await http.get(TICKER_URL, { limit: 10000 });
	}
};