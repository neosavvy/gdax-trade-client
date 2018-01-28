const Gdax = require('gdax');
const publicClient = new Gdax.PublicClient();
const _ = require('lodash');

async function listProducts() {
    try {
        const products = await publicClient.getProducts();
        _.map(products, (p) => console.log(JSON.stringify(p, null, 4)));
    } catch (error) {
        console.log(error)
    }
}

async function listCoinbaseAccounts( client ) {
    try {
        const accounts = await client.getCoinbaseAccounts();
        _.map(accounts, (a) => console.log(JSON.stringify(a, null, 4)));
    } catch (error) {
        console.log(error);
    }
}

async function listOrders( client ) {
    try {
        const orders = await client.getOrders();
        _.map(orders, (o) => console.log(JSON.stringify(o, null, 4)));
    } catch (error) {
        console.log(error)
    }
}


function listenPrices(auth, product, maxTicks = 10) {
    let count = 0;

    const websocket = new Gdax.WebsocketClient(
        [product],
        'wss://ws-feed.gdax.com',
        auth,
        {
            channels: ['ticker']
        }
    );

    websocket.on('message', data => {
        if(data.type === 'ticker') {
            count = count + 1;
            console.log(data);
            if( count === maxTicks ) {
                process.exit();
            }
        }
    });

    websocket.on('error', err => {
            console.log(err);
    });

    websocket.on('close', () => {
        // possibly kill all outstanding orders
    });
}

async function cancelAllOrders(client) {
    try {
        const cancelled = await client.cancelAllOrders();
        _.map(cancelled, (c) => console.log(JSON.stringify(c, null, 4)));
    } catch (error) {
        console.log(error);
    }
}

async function cancelForProduct(client, product) {
    try {
        const cancelled = await client.cancelAllOrders({ product_id: product });
        _.map(cancelled, (c) => console.log(JSON.stringify(c, null, 4)));
    } catch (error) {
        console.log(error);
    }
}

async function placeOrderWrapper(client, product, amount, limitPrice, side) {
    const params = {
        side: side,
        price: limitPrice, // USD
        size: amount, // BTC, BCH, ETH, LTC
        product_id: product,
        post_only: true
    };
    const orderConfirmation = await client.placeOrder(params);
    console.log(JSON.stringify(orderConfirmation, null, 4));
}

async function buyLimit(client, product, amount, limitPrice) {
    placeOrderWrapper(client, product, amount, limitPrice, 'buy')
}

async function sellLimit(client, product, amount, limitPrice) {
    placeOrderWrapper(client, product, amount, limitPrice, 'sell')
}

module.exports = {
    listProducts,
    listCoinbaseAccounts,
    listOrders,
    listenPrices,
    cancelAllOrders,
    cancelForProduct,
    buyLimit,
    sellLimit,
};
