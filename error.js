const log = require('./log');

// UserError is a class of error that doesn't cause a stacktrace to be printed.
class UserError extends Error {
	constructor(...args) {
		super();
	}
}

let error = function(...args) {
	throw new UserError(log.format(...args));
};

error.UserError = UserError;

module.exports = error;
