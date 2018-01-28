const commander = require('commander');
const fs = require('fs');
const gdax = require('./gdax');
const Gdax = require('gdax');

const apiURI = 'https://api.gdax.com';
const sandboxURI = 'https://api-public.sandbox.gdax.com';

commander.version('0.1.0')
	.option('-r --real')

    .option('-f --auth-file [authFile]', 'Authentication File with key, secret and passphrase')

    .option('-k --key [key]', 'Authentication Key from GDAX')
	.option('-s --secret [secret]', 'Authentication Secret from GDAX')
	.option('-p --passphrase [passphrase]', 'Authentication Passphrase from GDAX')

    .option('-l --list <type>',
        'List By Object Type',
        /^(coinbase-accounts|orders|products)$/i)

    .option('--daemon', 'Listen on a WebSocket and execute actions')
    .option('--daemon-ticks <n>', 'Number of ticks to listen for', parseInt)
    .option('-w --listen <product>',
        'Listen to Prices for Currency Pair',
        /^(BTC-USD|BCH-USD|ETC-USD|LTC-USD)$/,
        'BTC-USD')
	.parse(process.argv);

function determineURI() {
    return commander.real ? apiURI : sandboxURI;
}

function login() {
    if(commander.key && commander.secret && commander.passphrase) {
        return new Gdax.AuthenticatedClient(
            commander.key,
            commander.secret,
            commander.passphrase,
            determineURI()
        );
    } else if(commander.authFile) {
        try {
            const fileContents = fs.readFileSync(commander.authFile);
            const authFileContents = JSON.parse(fileContents);
            return new Gdax.AuthenticatedClient(
                authFileContents.key,
                authFileContents.secret,
                authFileContents.passphrase,
                determineURI()
            );
        } catch (error) {
            console.log("An Error Occurred Reading the file: ", commander.authFile);
            commander.help();
            process.exit(1);
        }
    } else {
        console.log("You must provide an auth-file or key, secret, and passphrase parameters");
        commander.help();
        process.exit(1)
    }
}

function getCredentials() {
    if(commander.key && commander.secret && commander.passphrase) {
        return {
            "key": commander.key,
            "secret": commander.secret,
            "passphrase": commander.passphrase
        };
    } else if(commander.authFile) {
        try {
            const fileContents = fs.readFileSync(commander.authFile);
            const authFileContents = JSON.parse(fileContents);
            return authFileContents;
        } catch (error) {
            console.log("An Error Occurred Reading the file: ", commander.authFile);
            commander.help();
            process.exit(1);
        }
    }
}

const authedClient = login();

if(commander.list) {
    switch (commander.list) {
        case "coinbase-accounts":
            gdax.listCoinbaseAccounts(authedClient)
            break;
        case "orders":
            gdax.listOrders(authedClient);
            break;

        case "products":
            gdax.listProducts(authedClient);
            break;
    }

}


if(commander.daemon) {
    const selectedProduct = commander.listen;
    const credentials = getCredentials();
    const ticks = commander.daemonTicks <= 0 ? 1 : commander.daemonTicks;
    gdax.listenPrices(
        credentials,
        selectedProduct,
        ticks
    );
}