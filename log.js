const util = require('util');
const prompt = require('./prompt');

const log = (...args) => {
	const stringify = (s) => {
		if (typeof s === 'string') {
			return s;
		} else {
			return util.inspect(s);
		}
	};

	const str = args.map(stringify).join(' ');
	prompt.log(str);
};

module.exports = log;
