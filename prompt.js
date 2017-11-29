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

prompt.setPrompt = function(prefix) {
	this.prompt = prefix + '> ';
	if (this.rl) {
		this.rl.setPrompt(this.prompt);
	}
};

prompt.ask = async function ask() {
	const result = await new Promise(resolve => {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdin
		});

		this.rl.on('close', () => {
			if (this.rl) {
				log('Exiting');
				console.log();
				process.exit(0);
			}
		});

		this.rl.question(this.prompt, response => {
			let oldRl = this.rl;
			this.rl = null;
			oldRl.close();
			resolve(response);
		});
	});

	return result.trim();
};

module.exports = prompt;
