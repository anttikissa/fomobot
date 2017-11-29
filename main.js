const prompt = require('./prompt');
const log = require('./log');

async function main() {
	while (true) {
		const cmd = await prompt.ask();
		log('Hello', cmd);
		if (cmd === 'q') {
			return;
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
