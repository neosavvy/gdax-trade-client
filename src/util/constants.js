const apiURI = 'https://api.gdax.com';
const sandboxURI = 'https://api-public.sandbox.gdax.com';

const wsApiURI = 'wss://ws-feed.gdax.com';
const sandboxWsApiURI = 'wss://ws-feed.sandbox.gdax.com';

const PRODUCT_ID_REGEX = /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i;

const CANDLE_TO_SECONDS_MAP = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '6h': 21600,
    '1d': 86400,
};

const CANDLE_TO_MILLIS_MAP = {
    '1m': 60 * 1000,
    '5m': 300 * 1000,
    '15m': 900 * 1000,
    '1h': 3600 * 1000,
    '6h': 21600 * 1000,
    '1d': 86400 * 1000,
};


module.exports = {
    apiURI,
    sandboxURI,
    wsApiURI,
    sandboxWsApiURI,
    PRODUCT_ID_REGEX,
    CANDLE_TO_SECONDS_MAP,
    CANDLE_TO_MILLIS_MAP
};