let prompt = require('./prompt');
let error = require('./error');
let log = require('./log');
let print = require('./log').print;
let util = require('./util');

const commands = {
	help: () => {
		for (let cmd in commands) {
			let fn = commands[cmd];
			let args = fn.toString().match(/\((.*)\) =>/)[1];

			let paddedCmd = util.pad(cmd, 10);
			if (args) {
				print(paddedCmd, args.split(', ').map(arg => `${arg}`).join(' '));
			} else {
				print(paddedCmd);
			}
		}
	}
};

for (let file of require('fs').readdirSync(require('path').join(__dirname, 'command'))) {
	let name = file.replace(/.js$/, '');
	commands[name] = require(`./command/${name}`);
}

function completer(line) {
	let cmds = Object.keys(commands);
	const hits = cmds.filter(cmd => cmd.startsWith(line));
	return [hits.length ? hits : cmds, line];
}

function isCommand(cmd) {
	return commands[cmd];
}

async function run(cmd, ...args) {
	if (!isCommand(cmd)) {
		error('Not a command', cmd);
	}

	await commands[cmd](...args);
}

module.exports = {
	isCommand,
	run,
	completer
};
