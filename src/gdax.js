const Gdax = require('gdax');
const publicClient = new Gdax.PublicClient();
const _ = require('lodash');
const Table = require('easy-table');

function output(mode, data) {
    if(!data || _.isEmpty(data)) {
        return;
    }
    if(mode === 'json') {
        _.forEach(data, (d) => console.log(JSON.stringify(d, null, 4)));
    } else {
        const t = new Table();
        _.forEach(data, (d) => {
            const keys = _.keys(d);
            _.forEach(keys, (k) => t.cell(k, d[k]));
            t.newRow();
        });
        console.log(t.toString());
    }
}

async function listProducts(client, mode = 'json') {
    try {
        const products = await client.getProducts();
        output(mode, products);
    } catch (error) {
        console.log(error)
    }
}

async function listCoinbaseAccounts(client, mode = 'json') {
    try {
        const accounts = await client.getCoinbaseAccounts();
        output(mode, accounts);
    } catch (error) {
        console.log(error);
    }
}

async function listGdaxAccounts(client, mode = 'json') {
    try {
        const accounts = await client.getAccounts();
        output(mode, accounts);
    } catch (error) {
        console.log(error);
    }
}
async function listOrders(client, mode = 'json') {
    try {
        const orders = await client.getOrders();
        output(mode, orders);
    } catch (error) {
        console.log(error)
    }
}


function listenPrices(auth, product, maxTicks = 10, mode = 'json') {
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
            output(mode, data)
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

async function cancelAllOrders(client, mode = 'json') {
    try {
        const cancelled = await client.cancelAllOrders();
        output(mode, cancelled);
    } catch (error) {
        console.log(error);
    }
}

async function cancelForProduct(client, product, mode = 'json') {
    try {
        const cancelled = await client.cancelAllOrders({ product_id: product });
        output(mode, cancelled);
    } catch (error) {
        console.log(error);
    }
}

async function placeOrderWrapper(client, product, amount, limitPrice, side, mode = 'json') {
    const params = {
        side: side,
        price: limitPrice, // USD
        size: amount, // BTC, BCH, ETH, LTC
        product_id: product,
        post_only: true
    };
    const orderConfirmation = await client.placeOrder(params);
    output(mode, orderConfirmation);
    return orderConfirmation;
}

async function buyLimit(client, product, amount, limitPrice, mode = 'json') {
    return placeOrderWrapper(client, product, amount, limitPrice, 'buy', mode)
}

async function sellLimit(client, product, amount, limitPrice, mode = 'json') {
    return placeOrderWrapper(client, product, amount, limitPrice, 'sell', mode)
}

async function listPositions(client, mode = 'json') {
    const positions = await client.listPositions();
    console.log(positions);
    output(mode, positions.accounts);
}

async function listHolds(client, mode = 'json') {
    const positions = await client.listPositions();
    console.log(positions);
    output(mode, positions.accounts);
}

module.exports = {
    listProducts,
    listCoinbaseAccounts,
    listGdaxAccounts,
    listOrders,
    listenPrices,
    cancelAllOrders,
    cancelForProduct,
    buyLimit,
    sellLimit,
    listPositions,
};
