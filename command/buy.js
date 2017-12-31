let prompt = require('../prompt');
let btx = require('../bittrex');
let ctx = require('../context');
let print = require('../log').print;
let db = require('../db');

module.exports = async () => {
	if (!ctx.currentMarket) {
		error('Need a market');
	}

	let ticker = await btx.getTicker(ctx.currentMarket.MarketName);

	print(ticker);

	let question = `Buying 0.001 BTC worth of ${ctx.currentMarket.MarketCurrency}, q to quit`;
	let answer = await prompt.ask(question);

	let btc = 0.001;
	let price = ticker.Last;
	let amount = btc / price;

	if (answer === 'q') {
		return;
	}

	let { insertId } = await db.order.insert({
		exchange_id: 'blsadsdflb' + Math.random(),
		type: 'buy',
		amount_filled: 0,
		amount: amount,
		price: price,
		status: 'new'
	});

	print('insert id', insertId);
};

let log = require('../log');
