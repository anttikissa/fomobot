const prompt = require('./prompt');
const log = require('./log');
const bittrex = require('./bittrex');
const db = require('./db');

const context = require('./context');

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

		return markets.map(market => {
			return market.MarketName + ' (' + market.MarketCurrencyLong + '), min trade size ' + market.MinTradeSize;
		}).join('\n');
	},

	async o(orderId) {
		if (!orderId) {
			return 'orderId required';
		}

		log(`Fetching order ${orderId}`);

		return await bittrex.getOrder(orderId);
	},

	async os() {
		log('Fetching orders...');

		let orders = await bittrex.getOrders();
		return orders.slice(0, 10);
	},

	async sync() {
		let orders = await bittrex.getOrders();
		log(`Fetched ${orders.length} orders.`);
		for (let order of orders) {
			let sellFactor = order.OrderType === 'LIMIT_SELL' ? 1 : -1;

			let trade = {
				exchange: 'bittrex',
				exchange_id: order.OrderUuid,
				currency: order.Exchange.split('-')[1],
				base_currency: order.Exchange.split('-')[0],
				amount: order.Quantity - order.QuantityRemaining,
				price: order.Limit,
				value: sellFactor * order.Price,
				fee: -order.Commission,
				opened: order.TimeStamp,
				closed: order.Closed
			};

			await db.trade.upsert(trade);
		}

		return `Synchronized ${orders.length} orders.`;
	}
};

module.exports = {
	async process(cmd, args) {
		if (commands[cmd]) {
			return await commands[cmd](...args);
		}
	}
};
