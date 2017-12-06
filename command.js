const prompt = require('./prompt');
const log = require('./log');
const bittrex = require('./bittrex');
const db = require('./db');
const ctx = require('./context');
const util = require('./util');
const error = require('./error');

const context = require('./context');

async function pause() {
	let result = await prompt.ask('ok?');
	if (result === 'q') {
		error('abort');
	}
}

const commands = {
	q() {
		process.exit(0);
	},

	async b() {
		if (!context.currentMarket) {
			return 'Choose market first';
		}

		let currency = context.currentMarket.MarketCurrency;

		let defaultAmount = 0.01;

		let amount = await prompt.ask(`Amount of BTC to spend [${defaultAmount}]`);

		if (amount === '') {
			amount = defaultAmount;
		}

		if (isNaN(amount)) {
			return 'Not buying.';
		}

		log(`Buying ${Number(amount)} ${currency}...`);

		return await bittrex.buy(currency, amount);
	},

	async m() {
		let markets = await bittrex.getMarkets();
		markets = markets.filter(market => market.BaseCurrency === 'BTC').sort((x, y) => {
			return x.MarketName < y.MarketName ? -1 : x.MarketName === y.MarketName ? 0 : 1;
		});

		return markets
			.map(market => {
				return (
					market.MarketName +
					' (' +
					market.MarketCurrencyLong +
					'), min trade size ' +
					market.MinTradeSize
				);
			})
			.join('\n');
	},

	// Currency (e.g. RBY) optional
	async ba(currency) {
		currency = currency ? currency.toUpperCase() : null;

		return (await bittrex.getBalances()).filter(balance => {
			if (currency) {
				if (balance.Currency !== currency) {
					return false;
				}
			}
			return balance.Balance > 0;
		});
	},

	async o(orderId) {
		if (!orderId) {
			return 'orderId required';
		}

		log(`Fetching order ${orderId}`);

		return await bittrex.getOrder(orderId);
	},

	async os(market) {
		log('Fetching orders...');

		let orders = await bittrex.getOrders(market);
		return orders.slice(0, 10);
	},

	// Orders per this market
	async osthis() {
		if (!ctx.currentMarket.MarketName) {
			error('No market');
		}
		return await bittrex.getOrders(ctx.currentMarket.MarketName);
	},

	// current market
	async cm() {
		return ctx.currentMarket;
	},

	async sync() {
		let deposits = await bittrex.getDeposits();
		log(`Fetched ${deposits.length} deposits.`);

		for (let deposit of deposits) {
			let type = 'deposit';

			let trade = {
				// exchange: 'bittrex',
				exchange_id: deposit.Id,
				type,
				currency: deposit.Currency,
				base_currency: `BTC`,
				amount: deposit.Amount,
				price: 0,
				value: 0,
				fee: 0,
				opened: deposit.LastUpdated,
				closed: deposit.LastUpdated,
			};

			await db.trade.upsert(trade);

		}


		let orders = await bittrex.getOrders();
		log(`Fetched ${orders.length} orders.`);
		for (let order of orders) {
			let isSell = order.OrderType === 'LIMIT_SELL';
			let sellFactor = isSell ? -1 : 1;
			let type = isSell ? 'sell' : 'buy';

			let trade = {
				// exchange: 'bittrex',
				exchange_id: order.OrderUuid,
				type,
				currency: order.Exchange.split('-')[1],
				base_currency: order.Exchange.split('-')[0],
				amount: sellFactor * (order.Quantity - order.QuantityRemaining),
				price: order.Limit,
				value: -sellFactor * order.Price,
				fee: -order.Commission,
				opened: order.TimeStamp,
				closed: order.Closed,
			};

			await db.trade.upsert(trade);
		}

		return `Synchronized ${orders.length} orders.`;
	},

	async pos() {
		return await db.position.select();
	},

	// Finds trades that are not associated with a position and creates positions out of them.
	async p() {
		await this.sync();

		// await db.query('delete from position');
		// await db.query('update trade set position_id = null');
		// TODO forget deposits for now
		let trades = await db.query(`
SELECT * FROM trade
WHERE position_id IS NULL
AND type != 'deposit'
ORDER BY opened`);

		log('Processing ' + trades.length + ' trades');

		for (let trade of trades) {
			let position = await db.queryOne`
SELECT * FROM position
WHERE currency = ${trade.currency}
AND base_currency = ${trade.base_currency}
AND closed = 0
AND amount != 0
`;

			if (position) {
				log(`Had existing position ${position.amount} ${position.currency}`);
			}

			if (trade.type === 'buy' || trade.type === 'deposit') {
				if (trade.type === 'buy') {
					log(`BUY  ${trade.amount} ${trade.currency} at ${trade.price}: ${trade.value}`);
				} else {
					log(`DEP  ${trade.amount} ${trade.currency}`);
				}

				if (!position) {
					position = {
						currency: trade.currency,
						base_currency: trade.base_currency,
						amount: trade.amount,
						value: trade.value,
						max_value: Math.abs(trade.value),
						fees: trade.fee,
						price: util.round(trade.value / trade.amount),
						last_trade_price: trade.price,
						target: util.round(1.04 * trade.price),
						stop: util.round(0.98 * trade.price),
						created: trade.closed,
						updated: trade.closed,
						closed: 0,
					};

					if (trade.type === 'deposit') {
						delete position.target;
						delete position.stop;
					}

					position.id = (await db.position.insert(position)).insertId;
				} else {
					position.amount += trade.amount;
					position.value += trade.value;
					position.fees += trade.fee;
					position.last_trade_price = trade.price;
					position.max_value = Math.max(Math.abs(position.value), position.max_value);

					if (position.amount !== 0) {
						position.price = util.round(position.value / position.amount);
					}

					if (position.amount === 0) {
						position.price = null;
						position.closed = 1;
					}

					position.updated = trade.closed;
					await db.position.update(position);
				}
			}

			if (trade.type === 'sell') {
				log(`SELL ${trade.amount} ${trade.currency} at ${trade.price}: ${trade.value}`);
				if (!position) {
					// TODO shorting - not supported yet
					position = {
						currency: trade.currency,
						base_currency: trade.base_currency,
						amount: trade.amount,
						value: trade.value,
						max_value: Math.abs(trade.value),
						fees: trade.fee,
						price: util.round(trade.value / trade.amount),
						last_trade_price: trade.price,
						target: util.round(0.96 * trade.price),
						stop: util.round(1.02 * trade.price),
						created: trade.closed,
						updated: trade.closed,
						closed: 0,
					};

					position.id = (await db.position.insert(position)).insertId;
				} else {
					position.amount += trade.amount;
					position.value += trade.value;
					position.fees += trade.fee;
					position.last_trade_price = trade.price;
					position.max_value = Math.max(Math.abs(trade.value), position.max_value);

					if (position.amount !== 0) {
						position.price = util.round(position.value / position.amount);
					}

					if (position.amount === 0) {
						position.price = null;
						position.closed = 1;
					}

					position.updated = trade.closed;

					await db.position.update(position);
				}
			}

			let tradeId = trade.id;
			let positionId = position.id;

			await db.trade.update(tradeId, { position_id: positionId });
		}
		return 'ok';
	},

	async dep() {
		return await bittrex.getDeposits();
	}
};

module.exports = {
	isCommand(cmd) {
		return !!commands[cmd];
	},

	async process(cmd, args) {
		if (commands[cmd]) {
			return await commands[cmd](...args);
		}
	},
};
