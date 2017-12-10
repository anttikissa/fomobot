
const util = {
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
	},

	pad(str, n = 2) {
		let result = String(str);
		while (result.length < n) {
			result = ' ' + result;
		}
		return result;
	},

	// Format crypto number for presentation
	format(number) {
		let result = number;
		if (typeof result === 'number') {
			result = number.toFixed(8);
		}

		// Enough for 123456.12341234
		return util.pad(result, 8 + 1 + 6);
	},

	// Format for contexts with no padding
	formatNoPad(number) {
		let result = number;
		if (typeof result === 'number') {
			result = number.toFixed(8);
		}

		return result;
	},

	// organizeBy([{ id: 1, name: 'x' }, { id: 2, name: 'y' }], 'id')
	// => { 1: { id: 1, name: 'x, }, 2: { id: 2, name: 'y' } }
	organizeBy(things, key) {
		let result = {};
		for (let thing of things) {
			let val = thing[key];
			result[val] = thing;
		}

		return result;
	}
};

module.exports = util;
