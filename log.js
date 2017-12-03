const util = require('util');
const prompt = require('./prompt');

const format = (...args) => {
	const stringify = (s) => {
		if (typeof s === 'string') {
			return s;
		} else {
			return util.inspect(s);
		}
	};

	const str = args.map(stringify).join(' ');

	return str;
};

const log = (...args) => {
	prompt.log(format(...args));
};

log.format = format;

module.exports = log;
