let cmc = require('../service/coinmarketcap');
let { bottleneck } = require('../util');
let db = require('../db');

let { print } = require('../log');

module.exports = async () => {
	let tickers = await cmc.updateTickers();
	let count = tickers.length;

	print(`Coinmarketcap: got ${count} tickers`);

	let jobs = tickers.map((ticker, idx) => () => {
		print(`${idx}/${count} Updating ticker ${ticker.symbol}`);
		return db.tickers.upsert({
			currency: ticker.symbol,
			name: ticker.name,
			price_btc: ticker.price_btc,
			volume_24h_usd: ticker['24h_volume_usd'],
			supply: ticker.available_supply,
			market_cap_usd: ticker.market_cap_usd
		});
	});

	await bottleneck(5, jobs);
};
