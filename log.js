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

const date = () => {
	return new Date().toISOString().replace('T', ' ').replace('Z', '');
};

const log = (...args) => {
	prompt.log(`${date()} ${format(...args)}`);
};

// Without the timestamp, good for interactive UI
const print = (...args) => {
	prompt.log(`${format(...args)}`);
};

log.format = format;
log.print = print;

module.exports = log;
