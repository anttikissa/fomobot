const error = require('./error');
const prompt = require('./prompt');
const commands = require('./commands');
const ctx = require('./context');

const log = require('./log');
const print = log.print;

async function main() {

	while (true) {
		const line = await prompt.ask(null, commands.completer);
		const [cmd, ...args] = line.split(' ').filter(Boolean);

		try {
			if (!cmd) {
				if (ctx.currentMarket) {
					await commands.run('ticker');
				}
				continue;
			}
			if (!commands.isCommand(cmd)) {
				log.print('No such command', cmd);
				continue;
			}
			await commands.run(cmd, ...args);
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
