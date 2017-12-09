const error = require('./error');
const prompt = require('./prompt');
const log = require('./log');
const print = log.print;

const commands = {
	help: () => 'hello',
	hello: (...who) => print('hello ', ...who),
	sleep: async () => {
		let len = await prompt.ask('How long?');
		return new Promise(resolve => {
			setTimeout(resolve, len || 500);
		});
	},
};

function commandsCompleter(line) {
	let cmds = Object.keys(commands);
	const hits = cmds.filter(cmd => cmd.startsWith(line));
	return [hits.length ? hits : cmds, line];
}

async function main() {
	while (true) {
		const line = await prompt.ask('', commandsCompleter);
		const [cmd, ...args] = line.split(' ').filter(Boolean);

		try {
			if (!cmd) {
				continue;
			}
			if (!commands[cmd]) {
				log.print('No such command', cmd);
				continue;
			}
			await commands[cmd](...args);
		} catch (err) {
			if (err instanceof error.UserError) {
				log('Error', err.message);
			} else {
				log(err);
			}
		}
	}
}

main().then(log, log);

require('./autoexit')();
