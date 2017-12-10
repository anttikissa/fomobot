let btx = require('../bittrex');
let { print } = require('../log');
let util = require('../util');
let ctx = require('../context');

module.exports = async () => {
	if (!ctx.currentMarket) {
		return;
	}

	let fmt = util.formatNoPad;
	let curr = ctx.currentMarket.MarketCurrency;
	let ticker = await btx.getTicker(ctx.currentMarket.MarketName);
	print(`${util.pad(curr, 4)}: ask ${fmt(ticker.Ask)}, bid ${fmt(ticker.Bid)}, last ${fmt(ticker.Last)}`);
};
