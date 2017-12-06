const log = require('./log');
const prompt = require('./prompt');

const MTProto = require('telegram-mtproto').MTProto;

const phone = {
	num: '+358451122566',
	code: '97028',
};

const api = {
	layer: 57,
	initConnection: 0x69796de9,
	api_id: 49631,
};

const server = {
	dev: false,
};

const client = MTProto({ server, api });

async function connect() {
	log('Connecting...');

	const { phone_code_hash } = await client('auth.sendCode', {
		phone_number: phone.num,
		current_number: false,
		api_id: 49631,
		api_hash: 'fb050b8f6771e15bfda5df2409931569',
	});

	let code = await prompt.ask('Phone code');

	const { user } = await client('auth.signIn', {
		phone_number: phone.num,
		phone_code_hash: phone_code_hash,
		phone_code: code,
	});

	log('signed as ', user);
}

connect()
	.then(console.log)
	.catch(err => {
		log('fail', err);
	});
