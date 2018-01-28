const commander = require('commander');
const fs = require('fs');
const gdax = require('./gdax');
const Gdax = require('gdax');

const apiURI = 'https://api.gdax.com';
const sandboxURI = 'https://api-public.sandbox.gdax.com';

commander.version('0.1.0')
	.option('-d --dry')
    .option('-f --auth-file [authFile]', 'Authentication File with key, secret and passphrase')
	.option('-k --key [key]', 'Authentication Key from GDAX')
	.option('-s --secret [secret]', 'Authentication Secret from GDAX')
	.option('-p --passphrase [passphrase]', 'Authentication Passphrase from GDAX')
    .option('-lo --list-orders')
    .option('-lca --list-coinbase-accounts')
    .option('-lp --list-products')
    .option('-w --ws-listen-prices')

	.parse(process.argv);

function login() {
    if(commander.key && commander.secret && commander.passphrase) {
        return new Gdax.AuthenticatedClient(
            commander.key,
            commander.secret,
            commander.passphrase,
            commander.dry ? sandboxURI : apiURI
        );
    } else if(commander.authFile) {
        try {
            const fileContents = fs.readFileSync(commander.authFile);
            const authFileContents = JSON.parse(fileContents);
            return new Gdax.AuthenticatedClient(
                authFileContents.key,
                authFileContents.secret,
                authFileContents.passphrase,
                commander.dry ? sandboxURI : apiURI
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

const authedClient = login();

if(commander.listOrders) {
    gdax.listOrders(authedClient);
}

if(commander.listProducts) {
    gdax.listProducts(authedClient);
}

if(commander.listCoinbaseAccounts) {
    gdax.listCoinbaseAccounts(authedClient)
}

if(commander.wsListenPrices) {
    gdax.listenPrices(
        commander.key,
        commander.secret,
        commander.passphrase
    );
}