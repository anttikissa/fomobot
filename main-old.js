const log = require('./log');
const prompt = require('./prompt');
// const db = require('./db');
const bittrex = require('./bittrex');
const command = require('./command');
const util = require('./util');
const ctx = require('./context');
const error = require('./error');

async function updateTicker() {
	if (!ctx.currentMarket) {
		return;
	}
	let market = ctx.currentMarket.MarketName;

	let ticker = await bittrex.getTicker(market);
	log(`Last: ${ticker.Last}, Bid: ${ticker.Bid}, Ask: ${ticker.Ask}, Spread: ${util.spread(ticker)}`);

	if (ticker) {
		let tickerString = ticker.Last;
		prompt.setPrompt(`${market} ${tickerString}`);
	} else {
		prompt.setPrompt(`${market}`);
	}
}

// Attempt to set market to BTC-<currency>
// Does nothing if market not found
async function trySetMarket(currency) {
	const market = await bittrex.getMarket(currency);
	if (!market) {
		return log('no such market');
	}
	ctx.currentMarket = market;
	ctx.updated();

	await updateTicker();
}

async function main() {
	// Saved context?
	if (ctx.currentMarket) {
		await updateTicker();
	}

	while (true) {
		const line = await prompt.ask();
		const [ cmd, ...args ] = line.split(' ').filter(Boolean);

		if (!cmd) {
			await updateTicker();
			continue;
		}

		try {
			if (command.isCommand(cmd)) {
				let commandResult = await command.process(cmd, args);
				log(commandResult);
			} else {
				await trySetMarket(cmd);
			}
		} catch (err) {
			if (err instanceof error.UserError) {
				log('Error', err.message);
			} else {
				log(err);
			}
		}
	}
}

main().then(() => {
	process.exit(0);
}).catch(err => {
	log(err);
});

require('./autoexit')();

// process.on('unhandledRejection', (err) => {
// 	console.log(err, err.stack);
// });

