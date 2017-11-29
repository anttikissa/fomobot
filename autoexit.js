const log = require('./log');

const autoexit = () => Object.keys(require.cache).forEach(key => {
	let watcher =
		require('chokidar').watch(key);
	watcher.on('change', (file) => {
		let relative = require('path').relative(__dirname, file);
		log(`${relative} changed, restarting.`);
		process.exit(10);
	})
});

module.exports = autoexit;

