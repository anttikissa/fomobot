let btx = require('../exchange/bittrex');
let { print } = require('../log');
let util = require('../util');
let ctx = require('../context');

let prompt = require('../prompt');

module.exports = async () => {
	if (!ctx.currentMarket) {
		return;
	}

	let fmt = util.formatNoPad;
	let curr = ctx.currentMarket.MarketCurrency;
	let ticker = await btx.getTicker(ctx.currentMarket.MarketName);

	ctx.currentMarketAsk = util.formatNoPad(ticker.Ask);
	ctx.currentMarketBid = util.formatNoPad(ticker.Bid);

	ctx.updated();

	prompt.updatePromptFromContext();

	// print(`${curr} bid ${fmt(ticker.Bid)} ask ${fmt(ticker.Ask)} last ${fmt(ticker.Last)} spread ${util.spread(ticker)}`);
	let lastIsAsk = ticker.Ask === ticker.Last;
	let lastIsBid = ticker.Bid === ticker.Last;

	let lastMsg = '';
	if (lastIsAsk) {
		lastMsg += ' (Ask)';
	}
	if (lastIsBid) {
		lastMsg += ' (Bid)';
	}

	print(`${ctx.currentMarket.MarketCurrency} Last ${fmt(ticker.Last)}${lastMsg} Spread ${util.spread(ticker)}`);
};
