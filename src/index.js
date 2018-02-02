#!/usr/bin/env node

const commander = require('commander');
const fs = require('fs');
const gdax = require('./gdax');
const Gdax = require('gdax');
const ExtendedClient = require('./authenticated');

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
        /^(coinbase-accounts|orders|products|gdax-accounts|positions|cost-basis)$/i)
    .option('--ignore-usd')

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
    .option('--buy-source-amount <amt>',
        'Amount of Currency to Buy in Source Currency',
        parseFloat)
    .option('--sell-source-amount <amt>',
        'Amount of Currency to Sell in Source Currency',
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
    .option('--execute-two-leg <product>',
        'Listen to Prices for Currency Pair',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)$/,
        'BTC-USD')
    .option('--entry-price <entryPrice>',
        'Entry Threshold')
    .option('--exit-price <exitPrice>',
        'Exit Threshold ')
	.parse(process.argv);

function determineURI() {
    return commander.real ? apiURI : sandboxURI;
}

function determineOutputMode() {
    if(commander.table) {
        return 'table';
    } else if ( commander.json ) {
        return 'json';
    } else {
        return 'json';
    }
}

function getAuthenticatedClient() {
    const credentials = getCredentials();
    if(credentials.key && credentials.secret && credentials.passphrase) {
        return new ExtendedClient(
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
    } else {
        return {
            "key": null,
            "secret": null,
            "passphrase": null
        }
    }
}

const authedClient = getAuthenticatedClient();
if(commander.list) {
    switch (commander.list) {
        case "coinbase-accounts":
            gdax.listCoinbaseAccounts(authedClient, determineOutputMode());
            break;
        case "gdax-accounts":
            gdax.listGdaxAccounts(authedClient, determineOutputMode(), commander.ignoreUsd);
            break;
        case "orders":
            gdax.listOrders(authedClient, determineOutputMode());
            break;
        case "products":
            gdax.listProducts(authedClient, determineOutputMode());
            break;
        case "positions":
            gdax.listPositions(authedClient, determineOutputMode());
            break;
        case "cost-basis":
            gdax.listCostBasis(authedClient, determineOutputMode());
            break;
    }
}


if(commander.cancel) {
    let currencyPair = commander.cancel;
    switch(currencyPair) {
        case "ALL":
            gdax.cancelAllOrders(authedClient, determineOutputMode());
            break;
        case "BTC-USD":
        case "BCH-USD":
        case "ETH-USD":
        case "LTC-USD":
            gdax.cancelForProduct(authedClient, currencyPair, determineOutputMode());
            break;
        default:
            console.log("Please provide a selection");
            commander.help();
            process.exit();
            break;
    }
}

if(commander.buyLimit) {
    console.log("buying...");
    if(commander.buySourceAmount) {
        const calculatedAmount = Number(commander.buySourceAmount / commander.limitPrice).toFixed(5);
        console.log("Submitting a BUY order for");
        console.log("Currency:    ", commander.buyLimit);
        console.log("Amount:      ", calculatedAmount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", calculatedAmount * commander.limitPrice);

        gdax.buyLimit(
            authedClient,
            commander.buyLimit,
            calculatedAmount,
            commander.limitPrice,
            determineOutputMode())
    } else {
        console.log("Submitting a BUY order for");
        console.log("Currency:    ", commander.buyLimit);
        console.log("Amount:      ", commander.amount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", commander.amount * commander.limitPrice);

        gdax.buyLimit(
            authedClient,
            commander.buyLimit,
            commander.amount,
            commander.limitPrice,
            determineOutputMode())
    }
}

if(commander.sellLimit) {
    if(commander.sellSourceAmount) {
        const calculatedAmount = Number(commander.sellSourceAmount / commander.limitPrice).toFixed(5);
        console.log("Submitting a SELL order for");
        console.log("Currency:    ", commander.sellLimit);
        console.log("Amount:      ", calculatedAmount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", calculatedAmount * commander.limitPrice);

        gdax.sellLimit(
            authedClient,
            commander.sellLimit,
            calculatedAmount,
            commander.limitPrice,
            determineOutputMode());
    } else {
        console.log("Submitting a SELL order for");
        console.log("Currency:    ", commander.sellLimit);
        console.log("Amount:      ", commander.amount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", commander.amount * commander.limitPrice);

        gdax.sellLimit(
            authedClient,
            commander.sellLimit,
            commander.amount,
            commander.limitPrice,
            determineOutputMode());
    }
}

if(commander.executeTwoLeg && commander.entryPrice && commander.exitPrice && commander.buySourceAmount) {
    const product = commander.executeTwoLeg;
    const entryPrice = Number(commander.entryPrice).toFixed(5);
    const exitPrice = Number(commander.exitPrice).toFixed(5);
    const buySourceAmount = commander.buySourceAmount;
    const targetAmount = Number(buySourceAmount / entryPrice).toFixed(5);

    if(entryPrice >= exitPrice) {
        console.log("Entry must be less than Exit");
        process.exit()
    }

    console.log(`Beginning Monitored Two Leg Trade for ${product}`);
    console.log(`Entry [BUY] Price: ${entryPrice}`);
    console.log(`Exit [SELL] Price: ${exitPrice}`);
    console.log(`Trade Amount:      ${targetAmount}`);

    const profit = (exitPrice * targetAmount) - (entryPrice * targetAmount);

    console.log(`Successful Execution will NET $${profit} USD`);

    const buyParams = {
        side: 'buy',
        price: entryPrice,
        size: targetAmount,
        product_id: product,
        post_only: true
    };

    const sellParams = {
        side: 'buy',
        price: exitPrice,
        size: targetAmount,
        product_id: product,
        post_only: true
    };

    gdax.executeTwoLegTrade(
        getCredentials(),
        getAuthenticatedClient(),
        profit,
        product,
        buyParams,
        sellParams);
}
