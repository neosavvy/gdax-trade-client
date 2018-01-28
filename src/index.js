const commander = require('commander');
const fs = require('fs');
const gdax = require('./gdax');
const Gdax = require('gdax');

const apiURI = 'https://api.gdax.com';
const sandboxURI = 'https://api-public.sandbox.gdax.com';

const wsApiURI = 'wss://ws-feed.gdax.com';
const sandboxWsApiURI = 'wss://ws-feed.sandbox.gdax.com';

commander.version('0.1.0')
    /**
     * Sandbox is default environment without this flag - safety first!
     */
    .option('-r --real', 'Real Trading Mode - Default is Sandbox. Safety First.')

    /**
     * Authentication
     */
    .option('-f --auth-file [authFile]', 'Authentication File with key, secret and passphrase')

    .option('-k --key [key]', 'Authentication Key from GDAX')
	.option('-s --secret [secret]', 'Authentication Secret from GDAX')
	.option('-p --passphrase [passphrase]', 'Authentication Passphrase from GDAX')

    /**
     * Public API Functions
     */
    .option('-l --list <type>',
        'List By Object Type',
        /^(coinbase-accounts|orders|products)$/i)

    /**
     * In Flight Order Management
     */
    .option('-c --cancel <type>',
        'Cancel By Product Id or All',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD|ALL)/i)

    /**
     * Trading Interface
     */
    .option('--buy-limit <symbol>',
        'Buy or Sell a Currency Pair as Limit Order',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('--sell-limit <symbol>',
        'Buy or Sell a Currency Pair as Limit Order',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('--amount <amt>',
        'Amount of Currency to Buy or Sell',
        parseFloat)
    .option('--limit-price <lmtPrice>',
        'Limit Price when Buying or Selling of a whole Unit',
        parseFloat)

    /**
     * Output Modes
     */
    .option('--table', 'Tabular Output Mode')
    .option('--json', 'JSON Output Mode')

    /**
     * Daemon Mode - for basic automated trading
     */
    .option('--daemon', 'Listen on a WebSocket and execute actions')
    .option('--daemon-ticks <n>', 'Number of ticks to listen for', parseInt)
    .option('-w --listen <product>',
        'Listen to Prices for Currency Pair',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)$/,
        'BTC-USD')
	.parse(process.argv);

function determineURI() {
    return commander.real ? apiURI : sandboxURI;
}

function getAuthenticatedClient() {
    const credentials = getCredentials();
    if(credentials.key && credentials.secret && credentials.passphrase) {
        return new Gdax.AuthenticatedClient(
            credentials.key,
            credentials.secret,
            credentials.passphrase,
            determineURI()
        );
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

const authedClient = getAuthenticatedClient();
if(commander.list) {
    switch (commander.list) {
        case "coinbase-accounts":
            gdax.listCoinbaseAccounts(authedClient);
            break;
        case "orders":
            gdax.listOrders(authedClient);
            break;

        case "products":
            gdax.listProducts(authedClient);
            break;
    }
}


if(commander.cancel) {
    let currencyPair = commander.cancel;
    switch(currencyPair) {
        case "ALL":
            gdax.cancelAllOrders(authedClient);
            break;
        case "BTC-USD":
        case "BCH-USD":
        case "ETH-USD":
        case "LTC-USD":
            gdax.cancelForProduct(authedClient, currencyPair);
            break;
        default:
            console.log("Please provide a selection");
            commander.help();
            process.exit();
            break;
    }
}

if(commander.buyLimit) {
    gdax.buyLimit(authedClient, commander.buyLimit, commander.amount, commander.limitPrice)
}

if(commander.sellLimit) {
    gdax.sellLimit(authedClient, commander.sellLimit, commander.amount, commander.limitPrice)
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