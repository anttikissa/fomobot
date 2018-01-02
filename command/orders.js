let btx = require('../bittrex');
let ctx = require('../context');
let print = require('../log').print;
let pad = require('../util').pad;

module.exports = async () => {
	if (!ctx.currentMarket) {
		error('Need a market');
	}

	let orders = await btx.getOrders(ctx.currentMarket.MarketName);

	let currencySum = 0;
	let btcSum = 0;

	if (orders.length === 0) {
		print(`You have no order history with ${ctx.currentMarket.MarketCurrency}`);
		return;
	}

	for (let order of orders) {
		let time = new Date(order.TimeStamp).toISOString().replace('Z', '').replace('T', ' ');
		let type = order.OrderType.replace(/^LIMIT_/, '');
		let isBuy = type === 'BUY';
		let payGet = isBuy ? ', pay' : ', get';
		let remaining = order.QuantityRemaining ? `(${order.QuantityRemaining} remaining)` : '';
		// let line = `${order.Exchange} ${time} ${type} ${order.Quantity} at ${order.Limit}${remaining}${payGet} ${order.Price} BTC, closed ${order.Closed}`;
		// TODO ignore the closed (or print something like "closed in 5 seconds")
		let line = `${order.Exchange} ${time} ${pad(type, 4)} ${order.Quantity.toFixed(8)} at ${order.Limit.toFixed(8)}${remaining}${payGet} ${order.Price} BTC`;
		if (order.IsConditional) {
			line += 'TODO conditional';
		}
		print(line);
		if (isBuy) {
			currencySum += order.Quantity;
			btcSum -= order.Price + order.Commission;
		} else {
			currencySum -= order.Quantity;
			btcSum += order.Price - order.Commission;
		}
	}

	let sum = currencySum.toFixed(8);
	let btc = btcSum.toFixed(8);

	let bid = ctx.currentMarketBid;

	if (btc < 0) {
		let profitPrice = (-btcSum / currencySum).toFixed(8);

		let profitable = false;

		if (bid) {
			// Very crude approximation - assumes that you can sell all of your position
			// at bid price, which often is not the case
			if (bid > profitPrice) {
				profitable = true;
			}
		}

		if (currencySum <= 0) {
			print(`${ctx.currentMarket.MarketCurrency} balance: ${sum}, BTC balance ${btc}`);
		}

		if (profitable) {
			print(`${ctx.currentMarket.MarketCurrency} balance: ${sum}, BTC balance ${btc}, sell over ${profitPrice} to stay profitable.`);
		} else {
			print(`${ctx.currentMarket.MarketCurrency} balance: ${sum}, BTC balance ${btc}, sell over ${profitPrice} to get profitable.`);
		}

		if (bid) {
			let sellAmount = -btcSum / bid;
			print(`Sell about ${sellAmount.toFixed()} at current bid ${bid} to bring BTC balance to 0.`);
		}
	} else {
		print(`${ctx.currentMarket.MarketCurrency} balance: ${sum}, BTC balance ${btc}. Profit!`);
	}

	if (bid) {
		print(`Total value: ${(bid * currencySum + btcSum).toFixed(8)} BTC`);
	}

};