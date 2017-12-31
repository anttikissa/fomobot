#!/usr/bin/env node

const config = require('./config');
const crypto = require('crypto');
const request = require('request');
const log = require('./log');
const error = require('./error');
const util = require('./util');

const ctx = require('./context');

const BASE_URL = 'https://bittrex.com/api/v1.1';

function sha512(secret, text) {
	const hash = crypto.createHmac('sha512', secret);
	hash.update(text);
	return hash.digest('hex');
}

async function api(path, params) {
	if (path[0] !== '/') {
		throw new Error('Must begin with /');
	}

	if (ctx.debug) {
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
	return await api('/account/getbalances');
}

// Update markets at least every... 10 minutes.
const MARKET_EXPIRY_DATE = 10 * 60 * 1000;

async function getMarkets() {
	if (ctx.markets) {
		if (Date.now() - ctx.marketsTimestamp > MARKET_EXPIRY_DATE) {
			ctx.debug && log('Markets data too old, refreshing.');
			ctx.markets = null;
		}
	}

	if (!ctx.markets) {
		ctx.markets = await api('/public/getmarkets');
		ctx.marketsTimestamp = Date.now();
		ctx.updated();
	}

	return ctx.markets;
}

async function getPrices() {
	let markets = await api('/public/getmarketsummaries');
	return markets.map(market => {

		let currency = market.MarketName.split('-')[1];
		let baseCurrency = market.MarketName.split('-')[0];

		return {
			currency,
			baseCurrency,
			bid: market.Bid,
			ask: market.Ask,
			last: market.Last
		}
	}).filter(market => market.baseCurrency === 'BTC');
}

// Get market (e.g. 'eth') or undefined if not found
// Market looks like:
// {
//  MarketCurrency: 'ETH',
// 	BaseCurrency: 'BTC',
// 	MarketCurrencyLong: 'Ethereum',
// 	BaseCurrencyLong: 'Bitcoin',
// 	MinTradeSize: 0.00565611,
// 	MarketName: 'BTC-ETH',
// 	IsActive: true,
// 	Created: '2015-08-14T09:02:24.817',
// 	Notice: null,
// 	IsSponsored: null,
// 	LogoUrl: 'https://bittrexblobstorage.blob.core.windows.net/public/7e5638ef-8ca0-404d-b61e-9d41c2e20dd9.png'
// }
async function getMarket(currency) {
	currency = currency.toUpperCase();
	let markets = await getMarkets();
	let market = markets.find(market => market.MarketName === 'BTC-' + currency);
	return market;
}

// Get ticker for current market, e.g. BTC-ETH
async function getTicker(market) {
	return await api('/public/getticker', { market });
}

// market (e.g. BTC-RBY or just RBY) is optional
async function getOrders(market) {
	let options = {};
	if (market) {
		options.market = util.toMarket(market);
	}

	return await api('/account/getorderhistory', options);
}

async function getOrder(orderId) {
	return await api('/account/getorder', { uuid: orderId });
}

async function getBalance(currency) {
	return await api('/account/getbalance', { currency });
}

// Buys 'amount' currency at price 'limit' (BTC).
// E.g. buy('eth', 1, 0.04912);
async function buy(currency, amount, limit) {
	let market = getMarket(currency);
	if (!market) {
		throw new Error('invalid market');
	}

	let buyResult = await api('/market/buylimit', {
		market: currentMarket.MarketName,
		quantity: amount,
		rate: limit
	});

	return buyResult;
}

// Sells `amount` `currency` at price `limit`.
async function sell(currency, amount, limit) {
	log('SEL', currency, amount, limit);

	let market = await getMarket(currency);
	if (!market) {
		throw new Error('invalid market');
	}

	let result = await api('/market/selllimit', {
		market: market.MarketName,
		quantity: amount,
		rate: limit
	});

	log('sell result', result);

	return result;

}

async function getDeposits() {
	return await api('/account/getdeposithistory');
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

module.exports = {
	getMarkets,
	getMarket,

	getTicker,
	getBalances,

	buy,
	sell,

	// orderStatus
	getOrders,
	getOrder,

	getDeposits,
	getPrices
};
