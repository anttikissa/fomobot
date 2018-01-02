let config = require('./config');
let log = require('./log');
let db = require('./db');

let _ = require('lodash');
let fs = require('fs');
let sc = require('socketcluster-client');

let credentials = {
	apiKey: config.coinigy.API_KEY,
	apiSecret: config.coinigy.API_SECRET,
};

let options = {
	hostname: 'sc-02.coinigy.com',
	port: '443',
	secure: 'true',
};

let socket = sc.connect(options);

// e.g. 'BTRX-NEOS/BTC' -> { buys: [ 3 best buys... ], sells: [ 3 best sells... ] }
// buy/sell has price, quantity, total

let counters = {
	channelsSubscribed: 0,
	orderBookMessages: 0,
	tradeMessages: 0,
	dbWrites: 0,
	dbErrors: 0,
	dbFinalErrors: 0,
	dbSolvedErrors: 0,
	dbRetries: 0,
};

function report() {
	let dbText = `, ${counters.dbWrites} db writes`;
	if (counters.dbErrors) {
		dbText += `, ${counters.dbErrors} db errors`;
	}
	if (counters.dbSolvedErrors) {
		dbText += `, ${counters.dbSolvedErrors} db solved errors`;
	}
	if (counters.dbFinalErrors) {
		log('HOX! THERE WERE ERRORS IN FINAL STATE. CHECK THE DUMP FILE.');
		dbText += `, ${counters.dbFinalErrors} db final errors`;
	}
	if (counters.dbRetries) {
		dbText += `, ${counters.dbRetries} db retries`;
	}
	if (counters.channelsSubscribed) {
		log(`Subscribed to ${counters.channelsSubscribed} channels.`);
	}
	log(`60 seconds status: ${counters.orderBookMessages} order book changes, ${counters.tradeMessages} trades${dbText}`)

	for (let key in counters) {
		counters[key] = 0;
	}
}

setInterval(() => {
	report();
}, 60 * 1000);

let orderBooks = {
};

socket.on('connect', function(status) {

	// log('Connected, status', status);

	socket.on('error', function(err) {
		log('Error', err);
		// Just start again
		log('Restarting because of error');
		process.exit(10);
	});

	socket.emit('auth', credentials, function(err, token) {
		if (err) {
			return log('Error authenticating', err);
		}

		// socket.emit('exchanges', null, (e, data) => {
		// 	log('exchanges', data);
		// });

		// BINA, CPIA, BTRX, BITF

		socket.emit('channels', null, (err, data) => {
			// log('Channels', data);
			let channels = data[0].map(c => c.channel);

			let myChannels = channels.filter((channel, idx) => {
				if (!channel) {
					return false;
				}
				// if (channel.match(/ETH/) && channel.match(/BTC/) && channel.match('TRADE')) {
				// 	log('MATCH', channel);
				// }
				// TODO debug
				// if (!channel.match('BTRX')) return;

				// return channel.match(/(TRADE)-(BINA|CPIA|BTRX|BITF)--.*--BTC/);
				return channel.match(/(ORDER|TRADE)-(BINA|CPIA|BTRX|BITF)--.*--BTC/);
			});

			myChannels = myChannels.filter(channel => {
				// return channel.match(/ETH--BTC/);
				return true;
				// if (result) {
				// 	result = channel.match('BINA');
				// }

				// if (result) {
				// 	log('SUBSCRIBE', result);
				// }

				return result;

				// log('channel', channel);
				return true;
			});

			// let start = new Date();
			// let counter = 0;

			// setInterval(() => {
			// 	let end = new Date();
			// 	let seconds = (end - start) / 1000;
			//
			// 	log(`Checkpoint reached. ${(counter / seconds).toFixed(2)} datapoints per second`);
			// }, 10000);

			// How many decimals is needed to represent the number?
			// min 8, max 12
			// TODO I guess this works but .toFixed() sometimes rounds the wrong way
			// function getDecimals(number) {
			// 	for (let i = 8; i < 12; i++ ) {
			// 		let multiplied = number * Math.pow(10, i);
			// 		if (Math.abs(multiplied - Math.round(multiplied)) < 0.001) {
			// 			return i;
			// 		}
			// 	}
			// 	return 12;
			// }
			log(`Subscribing to ${myChannels.length} channels.`);

			myChannels.forEach(channel => {
				// log('Subscribe', channel);

				if (channel.startsWith('ORDER')) {

					let orderChannelMatch = channel.match(/ORDER-(.*)--(.*)--(.*)/);
					let channelExchange = orderChannelMatch[1];
					let channelCurrency = orderChannelMatch[2];
					let channelBaseCurrency = orderChannelMatch[3];

					var channelPairId = `${channelExchange}-${channelCurrency}/${channelBaseCurrency}`;
					// log('Channel id', channelChannelId);
				}

				let subscribed = socket.subscribe(channel);
				counters.channelsSubscribed++;

				subscribed.watch(data => {
					let isTrade = !Array.isArray(data) && data.label;

					if (isTrade) {

						counters.tradeMessages++;

						let pairId = `${data.exchange}-${data.label}`;
						let orderBook = orderBooks[pairId];
						if (orderBook) {
							// log('Has order book', orderBook);
						}

						let exchange = data.exchange;
						let timestamp = new Date(data.time + 'Z');
						let otherTimestamp = new Date(data.time_local + 'Z');
						let coinigyTimestamp = new Date(data.timestamp);

						if (timestamp.getTime() !== otherTimestamp.getTime()) {
							log('ERROR timestamp discrepancy', data);
						}

						let tradeId = data.tradeid;
						let label = data.label;
						let price = data.price;
						let quantity = data.quantity;
						// TODO this is sometimes rounded differently than price * quantity
						// so use this one.
						let total = data.total;
						// let decimals = getDecimals(data.total);

						let labelMatch = label.match(/(.*)\/(.*)/);
						if (!labelMatch) {
							log('ERROR matching label, this should not happen', label, data);
							return;
						}

						let currency = labelMatch[1];
						let baseCurrency = labelMatch[2];

						if (baseCurrency !== 'BTC') {
							log('Only BTC accepted!', data.baseCurrency, data);
						}

						let orderType = (data.ordertype || data.type).toLowerCase();

						let tradeData = {
							exchange,
							trade_id: tradeId,
							currency,
							base_currency: baseCurrency,
							timestamp,
							coinigy_timestamp: coinigyTimestamp,
							type: orderType,
							price,
							quantity,
							total
						};

						let obData = '';

						if (orderBook) {
							if (orderBook.buys[0]) {
								tradeData.ob_buy_1_price = orderBook.buys[0].price;
								tradeData.ob_buy_1_quantity = orderBook.buys[0].quantity;
								obData += ` ob buy ${orderBook.buys[0].quantity} at ${orderBook.buys[0].price}`;
							}

							if (orderBook.buys[1]) {
								tradeData.ob_buy_2_price = orderBook.buys[1].price;
								tradeData.ob_buy_2_quantity = orderBook.buys[1].quantity;
							}

							if (orderBook.buys[2]) {
								tradeData.ob_buy_3_price = orderBook.buys[2].price;
								tradeData.ob_buy_3_quantity = orderBook.buys[2].quantity;
							}

							if (orderBook.sells[0]) {
								tradeData.ob_sell_1_price = orderBook.sells[0].price;
								tradeData.ob_sell_1_quantity = orderBook.sells[0].quantity;
								obData += ` ob sell ${orderBook.sells[0].quantity} at ${orderBook.sells[0].price}`;
							}

							if (orderBook.sells[1]) {
								tradeData.ob_sell_2_price = orderBook.sells[1].price;
								tradeData.ob_sell_2_quantity = orderBook.sells[1].quantity;
							}

							if (orderBook.sells[2]) {
								tradeData.ob_sell_3_price = orderBook.sells[2].price;
								tradeData.ob_sell_3_quantity = orderBook.sells[2].quantity;
							}
						}

						// log(`${pairId} ${orderType} ${quantity} at ${price} (${tradeId})${obData}`);

						db.trades.upsert(tradeData).then(result => {
							counters.dbWrites++;
						}).catch(err => {
							counters.dbErrors++;
							log(`DB error inserting ${exchange} ${tradeId}, will retry soon. Code: ${err.code}: ${err.sqlMessage}, SQL state: ${err.sqlState}, SQL: ${err.sql}`);

							let retries = 1;
							function retry() {
								log(`Retrying DB insert ${tradeData.exchange} ${tradeData.trade_id}...`);

								counters.dbRetries++;

								db.trades.upsert(tradeData)
								.then(result => {
									log(`DB insert ${tradeData.exchange} ${tradeData.trade_id} ok.`);
									counters.dbWrites++;
									counters.dbSolvedErrors++;
									// ok
								})
								.catch(err => {
									retries++;
									if (retries > 4) {
										log(`DB retry ${retries} failed, I give up`, err);
										fs.appendFileSync('db-failures.json', JSON.stringify(tradeData) + '\n', 'utf8');
										log('Data was written into db-failures.json');
									} else {
										log(`DB retry ${retries} failed, trying again...`, err);
										setTimeout(retry, 300 * retries);
									}
								});
							}

							setTimeout(retry, 300 + 200 * Math.random());
						});

						// log('tradeData', tradeData);

						// log('trade', timestamp, exchange, tradeId, currency, baseCurrency, price, quantity, total);

						// let myTotal = (price * quantity).toFixed(decimals);
						// let theirTotal = data.total.toFixed(decimals);

						// if (myTotal != theirTotal) {
						// 	log(`!!! DIFFERENCE, my ${myTotal}, their ${theirTotal}, decimals ${decimals}, raw`, data);
						// }

						// log('trade', data.exchange, data.label, data.tradeid, data.time_local, data.timestamp);
					} else {

						// Order book message
						counters.orderBookMessages++;

						// log('!!! ORDERBOOK?, data', data);
						let pairId = `${data[0].exchange}-${data[0].label}`;
						// log('pairId', channelPairId);
						// log('pairId', pairId);

						// order book
						let sells = data.filter(order => order.ordertype === 'Sell');
						let buys = data.filter(order => order.ordertype === 'Buy');

						buys = _.sortBy(buys, 'price').reverse().slice(0, 3);
						sells = _.sortBy(sells, 'price').slice(0, 3);
						// log('sells', sells);
						// log('buys', buys);
						// log('data', data);

						orderBooks[channelPairId] = { buys: buys, sells: sells };

						// log('channel', channel, 'channepairid', channelPairId);

					}
					// if (data)
					// log(data.label);
					// log('channel', channel, 'data', data);
					// if (counter % 1000 === 0) {
					// 	log('Counter', counter, 'from channel', channel);
					// }
					// counter++;
				});
			})


		});

		let channel = socket.subscribe('TRADE-BINA--BTC--USDT');

		channel.watch((...args) => {
			// log('data', args);
		});

			// var scChannel = socket.subscribe('TRADE-OK--BTC--CNY');

			// console.log(scChannel);
			//
			// scChannel.watch(function(data) {
			// 	log('!!! OK-BTC data', data);
			// });

			// socket.emit('exchanges', null, function(err, data) {
			// 	if (!err) {
			// 		console.log(data);
			// 	} else {
			// 		console.log(err);
			// 	}
			// });

			// socket.emit('channels', 'OK', function(err, data) {
			// 	if (!err) {
			// 		console.log(data);
			// 	} else {
			// 		console.log(err);
			// 	}
			// });
	});
});

require('./autoexit')();
