const readline = require('./node/readline');
const prompt = {};
module.exports = prompt;

let log = console.log;

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

const fs = require('fs');
const path = require('path');
let historyFile = path.join(process.env.HOME, '.fomobot-history');

if (!this.history) {
	try {
		let { history, line } = JSON.parse(fs.readFileSync(historyFile), 'utf8');
		prompt.history = history;
		prompt.line = line;
	} catch (err) {}
}

// Ask a question. If question is not specified, use prompt.prompt.
prompt.ask = async function ask(question = null, completer = null) {
	const result = await new Promise(resolve => {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdin,
			completer: completer,
			historySize: 1000,
		});

		if (this.history) {
			this.rl.history = this.history;
		}

		if (this.line) {
			setTimeout(() => {
				this.rl.write(this.line);
				this.rl.write(null, { ctrl: true, name: 'e' });
				this.line = null;
			}, 1);
		}

		this.rl.on('close', () => {
			if (this.rl) {
				console.log();

				fs.writeFileSync(
					historyFile,
					JSON.stringify(
						{
							history: this.rl.history,
							line: null,
						},
						null,
						2,
					),
					'utf8',
				);
				process.exit(0);
			}
		});

		let q = question != null ? question + '> ' : this.prompt;
		this.customQuestion = !!question;

		this.rl.question(q, response => {
			let oldRl = this.rl;
			this.history = this.rl.history;

			this.rl = null;
			oldRl.close();
			this.customQuestion = false;
			resolve(response);
		});
	});

	return result.trim();
};

prompt.saveHistoryAndCurrentLine = function() {
	if (this.rl) {
		fs.writeFileSync(
			historyFile,
			JSON.stringify(
				{
					history: this.rl.history,
					line: this.rl.line,
				},
				null,
				2,
			),
			'utf8',
		);
	}
};

// Best way ever to circumvent circular dependency
setTimeout(() => {
	const autoexit = require('./autoexit');

	autoexit.beforeExit(() => {
		prompt.saveHistoryAndCurrentLine();
	});
}, 1);

prompt.updatePromptFromContext = () => {
	let ctx = require('./context');
	if (ctx.currentMarket) {
		prompt.setPrompt(ctx.currentMarket.MarketCurrency);
	}
};

prompt.updatePromptFromContext();

module.exports = prompt;
