const prompt = require('./prompt');
const log = require('./log');

async function main() {
	while (true) {
		const cmd = await prompt.ask();
		if (cmd === 'q') {
			return;
		} else if (cmd === 'buy') {
			let amount = await prompt.ask('How much? (default: 10; q to quit)');
			if (amount === '') {
				amount = 10;
			}
			if (isNaN(amount)) {
				log('Not buying.');
			} else {
				log('Buying ' + Number(amount) + '...');
			}
		}
	}
}

main().then(() => {
	process.exit(0);
}).catch(err => {
	log(err);
});

setInterval(() => {
	// log('test');
	prompt.setPrompt('New ' + Math.random());
}, 800);

require('./autoexit')();
