const readline = require('./node/readline');
const prompt = {};
module.exports = prompt;
const log = require('./log');

// Usage:

prompt.rl = null;
prompt.prompt = '> ';

prompt.log = function(str) {
	if (this.rl) {
		this.rl.log(str);
	} else {
		console.log(str);
	}
};

// Are we asking a custom question?
// In that case, setPrompt() will not have an immediate effect.
prompt.customQuestion = false;

prompt.setPrompt = function(prefix) {
	this.prompt = prefix + '> ';
	if (this.rl && !this.customQuestion) {
		this.rl.setPrompt(this.prompt);
	}
};

// Ask a question. If question is not specified, use prompt.prompt.
prompt.ask = async function ask(question, completer = null) {
	const result = await new Promise(resolve => {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdin,
			completer: completer
		});

		this.rl.on('close', () => {
			if (this.rl) {
				// log('Exiting');
				console.log();
				process.exit(0);
			}
		});

		let q = question !== undefined ? question + '> ' : this.prompt;
		this.customQuestion = !!question;

		this.rl.question(q, response => {
			let oldRl = this.rl;
			this.rl = null;
			// log('Closing rl');
			oldRl.close();
			this.customQuestion = false;
			resolve(response);
		});
	});

	return result.trim();
};

module.exports = prompt;
