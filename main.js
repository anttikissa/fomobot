const prompt = require('./prompt');
const log = require('./log');
const db = require('./db');
const bittrex = require('./bittrex');
const command = require('./command');

let currentMarket = null;

async function main() {
	while (true) {
		const line = await prompt.ask();
		const [ cmd, ...args ] = line.split(' ').filter(Boolean);

		if (!cmd) {
			continue;
		}

		try {
			let commandResult = await command.process(cmd, args);
			if (!commandResult) {
				const markets = await bittrex.getMarkets();
				log('TODO look for market ' + cmd);
			}

			if (commandResult) {
				log(commandResult);
			}
		} catch (err) {
			log('Error:', err);
		}
	}
}

main().then(() => {
	process.exit(0);
}).catch(err => {
	log(err);
});

require('./autoexit')();

process.on('unhandledRejection', (err) => {
	log(err.message);
});