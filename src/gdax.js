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

module.exports = {
    listProducts,
    listCoinbaseAccounts,
    listOrders,
    listenPrices
};
