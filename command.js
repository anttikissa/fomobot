const prompt = require('./prompt');
const log = require('./log');
const bittrex = require('./bittrex');
const db = require('./db');

const commands = {
	q() {
		process.exit(0);
	},

	async buy() {
		let amount = await prompt.ask('How much? (default: 10; q to quit)');
		if (amount === '') {
			amount = 10;
		}
		if (isNaN(amount)) {
			log('Not buying.');
		} else {
			log('Buying ' + Number(amount) + '...');
		}
	},

	async m() {
		return await bittrex.getMarkets();
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
