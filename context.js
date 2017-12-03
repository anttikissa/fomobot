const fs = require('fs');
const path = require('path');

const context = {
	// Will be set to current market
	// Market looks like:
	// {
	//  MarketCurrency: 'ETH',
	// 	BaseCurrency: 'BTC',
	// 	MarketCurrencyLong: 'Ethereum',
	// 	BaseCurrencyLong: 'Bitcoin',
	// 	MinTradeSize: 0.00565611,
	// 	MarketName: 'BTC-ETH',
	// 	IsActive: true,
	// 	Created: '2015-08-14T09:02:24.817',
	// 	Notice: null,
	// 	IsSponsored: null,
	// 	LogoUrl: 'https://bittrexblobstorage.blob.core.windows.net/public/7e5638ef-8ca0-404d-b61e-9d41c2e20dd9.png'
	// }

	currentMarket: null,

	debug: false,
};

const contextFile = path.join(__dirname, 'context.json');

try {
	let savedContext = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
	Object.assign(context, savedContext);
} catch (err) {
}

context.updated = function() {
	fs.writeFileSync(contextFile, JSON.stringify(context, null, 2), 'utf8');
};

// TODO
context.debug = true;

module.exports = context;
