const request = require('request');

module.exports = {
	get: async function(url, params) {
		return await new Promise((resolve, reject) => {

			if (params) {
				var paramString = '?' + Object.keys(params).map(key => {
					return key + '=' + params[key];
				}).join('&');
			} else {
				var paramString = '';
			}

			const wholeUrl = url + paramString;

			request({
				url: wholeUrl
			}, (err, resp, body) => {
				if (err) {
					return reject(err);
				}

				try {
					const parsed = JSON.parse(body);
					return resolve(parsed);
				} catch (err) {
					return reject(err);
				}
			});
		});
	}
};

