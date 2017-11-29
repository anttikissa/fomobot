#!/usr/bin/env node

const config = require('./config');
const crypto = require('crypto');
const request = require('request');
const log = require('./log');

const BASE_URL = 'https://bittrex.com/api/v1.1';

function sha512(secret, text) {
	const hash = crypto.createHmac('sha512', secret);
	hash.update(text);
	return hash.digest('hex');
}

const DEBUG = false;

async function api(path, params) {
	if (path[0] !== '/') {
		throw new Error('Must begin with /');
	}

	if (DEBUG) {
		if (params) {
			log('API call', path, params);
		} else {
			log('API call', path);
		}
	}

	const result = await new Promise((resolve, reject) => {
		const allParams = Object.assign({}, params, {
			apikey: config.bittrex.API_KEY,
			nonce: Date.now()
		});

		const paramString = '?' + Object.keys(allParams).map(key => {
			return key + '=' + allParams[key];
		}).join('&');

		const uri = BASE_URL + path + paramString;
		const sign = sha512(config.bittrex.API_SECRET, uri);

		request({
			url: uri,
			headers: {
				apisign: sign
			}
		}, (err, resp, body) => {
			// verbose debug
			//log('body', body);
			if (err) {
				return reject(err);
			}
			try {
				const parsed = JSON.parse(body);
				if (parsed.success === false) {
					return reject(parsed.message);
				} else {
					return resolve(parsed.result);
				}
			} catch (e) {
				return reject('Cannot parse ' + body);
			}

			reject('never come here');
		});
	});

	return result;
}

let balances = null;
let markets = null;

let ticker = null;

async function getBalances() {
	balances = await api('/account/getbalances');
	log(`Received ${balances.length} balances.`);
}

async function getMarkets() {
	if (!markets) {
		markets = await api('/public/getmarkets');
		log(`Received ${markets.length} markets.`);
	}
	return markets;
}

function spread(ticker) {
	let diff = ticker.Ask - ticker.Bid;

	let relative = (diff / ticker.Bid * 100).toFixed(2) + ' %';

	return `${diff.toFixed(8)} (${relative})`;
}

async function getTicker() {
	if (!currentMarket) {
		throw new Error('No current market');
	}

	ticker = await api('/public/getticker', { market: currentMarket.MarketName } );
	log(`Last: ${ticker.Last}, Bid: ${ticker.Bid}, Ask: ${ticker.Ask}, Spread: ${spread(ticker)}`);
	updatePrompt();
}

async function getOrders() {
	return await api('/account/getorderhistory');

}

async function getOrder(orderId) {
	return await api('/account/getorder', { uuid: orderId });
}

// async function main() {
// 	await Promise.all([
// 		getBalances(),
// 		getMarkets()
// 	]);
//
//
// 	// let price = ticker.Ask;
//
// 	// if (false) {
// 	// 	let buyResult = await api('/market/buylimit', {
// 	// 		market: 'BTC-ETH',
// 	// 		quantity: '0.05',
// 	// 		rate: price
// 	// 	});
// 	//
// 	// 	log('buy result', buyResult);
// 	// }
// }
//
// main().catch(err => {
// 	log('Error', err);
// });

// REPL
const repl = require('repl');

let currentMarket = null;
let currentCurrency = null;
let currentMinTradeSize = null;

function updatePrompt() {
	if (!currentMarket) {
		return replInstance.setPrompt('no market> ');
	}

	if (ticker) {
		tickerString = ticker.Last;
		replInstance.setPrompt(`${currentMarket.MarketName} ${tickerString}> `);
	} else {
		replInstance.setPrompt(`${currentMarket.MarketName}> `);
	}

}

async function myEval(cmd, context, filename, callback) {
	if (!markets) {
		return callback(null, 'No markets. Try again in a second');
	}

	cmd = cmd.trim();

	if (!cmd) {
		return callback(null, 'Please specify a market.');
	}

	let wantedMarket = 'BTC-' + cmd.toUpperCase();

	let maybeMarket = markets.find(market => {
		if (market.MarketName === wantedMarket) {
			return true;
		}
	});

	if (maybeMarket) {
		let market = maybeMarket;
		// log('Found market', market);
		updatePrompt();

		currentMarket = market;
		currentCurrency = market.MarketCurrency;
		currentMinTradeSize = market.MinTradeSize;
		log(`Market ${currentMarket.MarketName} (${currentMarket.MarketCurrencyLong}), min trade ${currentMinTradeSize} ${currentCurrency}`);
		await getTicker();
	} else {
		callback(null, `Market not found: ${wantedMarket}`);
	}

	if (cmd === 'buy') {
		let quantity = 5211.047420531527;

		log('BUY', {
			market: currentMarket.MarketName,
			quantity: quantity.toFixed(2),
			rate: ticker.Ask * 0.995
		});

		let buyResult = await api('/market/buylimit', {
			market: currentMarket.MarketName,
			quantity: quantity.toFixed(2),
			rate: ticker.Ask * 0.995
		});

		log('buy result', buyResult);

	}

	callback(null, cmd);
}

process.on('unhandledRejection', what => {
	log('Unhandled', what);
});

module.exports = {
	getTicker,
	getBalances,
	// buy,
	// orderStatus
	getOrders,
	getOrder,
	getMarkets
};