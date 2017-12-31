let btx = require('../bittrex');
let { print } = require('../log');
let util = require('../util');

module.exports = async () => {
	let bal = await btx.getBalances();
	bal = bal.filter(b => b.Balance > 0);
	bal = bal.map(b => {
		return {
			currency: b.Currency,
			available: b.Available,
			balance: b.Balance
		};
	});

	print(`${util.pad('curr', 5)} ${util.format('available')} ${util.format('balance')}`);

	for (let b of bal) {
		print(`${util.pad(b.currency, 5)} ${util.format(b.available)} ${util.format(b.balance)}`);
	}
};