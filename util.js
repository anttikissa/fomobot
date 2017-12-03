module.exports = {
	spread(ticker) {
		let diff = ticker.Ask - ticker.Bid;

		let relative = (diff / ticker.Bid * 100).toFixed(2) + ' %';

		return `${diff.toFixed(8)} (${relative})`;
	}
};