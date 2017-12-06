module.exports = {
	spread(ticker) {
		let diff = ticker.Ask - ticker.Bid;

		let relative = (diff / ticker.Bid * 100).toFixed(2) + ' %';

		return `${diff.toFixed(8)} (${relative})`;
	},

	toMarket(currencyOrMarket) {
		if (currencyOrMarket.includes('-')) {
			return currencyOrMarket.toUpperCase();
		} else {
			return 'BTC-' + currencyOrMarket.toUpperCase();
		}
	},

	round(number, digits = 8) {
		return Math.round(number * Math.pow(10, digits)) / Math.pow(10, digits);
	}

};
