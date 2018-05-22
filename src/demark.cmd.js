#!/usr/bin/env node

const commander = require('commander');
const colors = require('colors');
const moment = require('moment');
const { fork } = require('child_process');

const fs = require('fs');
const gdax = require('./api/gdax');
const Gdax = require('gdax');
const ExtendedClient = require('./util/authenticated');
const math = require('./util/math');
const _ = require('lodash');
const pjson = require('../package.json');

const AuthUtils = require('./util/authentication.util');
const { output, determineOutputMode } = require('./util/logging.util');
const {
    findCandlesSinceBearishFlip,
    findCandlesSinceBullishFlip,
    findRecentCombinedBullishAndBearishCandles,
    updateHistoryWithCounts
} = require('./util/demark.util');

commander.version(pjson.version)

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
     * Output Modes
     */
    .option('--table', 'Tabular Output Mode')
    .option('--json', 'JSON Output Mode')
    .option('--dump', 'Dump to JSON')

    .option('-m --monitor <product>', 'Product ID to Monitor', /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('-t --show-count <product>', 'Calculate Current Tom Demark Indicator', /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('-c --candle-size <size>', 'Candle Size or Timeframe', /^(1m|5m|15m|1h|6h|1d)/i)
    .option('--combined', 'Show Bearish and Bullish Combined')
    .parse(process.argv);


let timeout = null;
function initialCandleTimer(initialTimeout, candleTimeout, dataGatherer){
    console.log("Initial Timeout: ", initialTimeout);
    console.log("Initial Timeout: ", candleTimeout);

    const thisCandle = new moment().utc().startOf('minute');
    timeout = setTimeout(() => {
        console.log("Data Ending for Initial Candle, sending notification", thisCandle.toISOString());
        dataGatherer.send({ type: 'candleEnded', candleMoment: thisCandle });
        configureCandleTimer(candleTimeout, dataGatherer);
    }, initialTimeout);
}

function configureCandleTimer(candleTimeout, dataGatherer) {
    // set a timer based on granularity
    // upon expired timer send message to data gather to push data as a candle onto cached candles
    // reset / restart timer
    const thisCandle = new moment().utc().startOf('minute');
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        console.log("Data Ending for Candle, sending notification", thisCandle.toISOString());
        dataGatherer.send({ type: 'candleEnded', candleMoment: thisCandle });
        configureCandleTimer(candleTimeout, dataGatherer);
    }, candleTimeout);
}

if(commander.monitor && commander.candleSize) {
    const product = commander.monitor;
    const authedClient = AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile);
    const websocket = AuthUtils.getAuthenticatedWebSocket(commander.real, authedClient, product);
    const granularity = gdax.determineGranularity(commander.candleSize);
    const candleTimeout = gdax.determineGranularityMillis(commander.candleSize);

    // instantiate a forked data gatherer that just holds on to data cached from websocket messages
    // const dataGatherer = fork(__dirname + '/data_gatherer.proc.js', [], {
    //     execArgv: ['--inspect-brk=9229']
    // });
    const dataGatherer = fork(__dirname + '/data_gatherer.proc.js');
    gdax.listHistoricRates(
        authedClient,
        determineOutputMode(commander),
        product,
        granularity)
        .then((rates) => {
            const rateObjs = _.map(rates, r => {
                return {
                    time: moment.unix(r[0]),
                    low: r[1],
                    high: r[2],
                    open: r[3],
                    close: r[4],
                    volume: r[5]
                }
            });

            const combined = updateHistoryWithCounts(
                findRecentCombinedBullishAndBearishCandles(rateObjs)
            );
            // hand the combined candle data to the data gatherer
            dataGatherer.send({ type: 'historicCandles', payload: combined });


            // this minute
            const thisCandle = new moment();

            // next minute
            const nextMinute = new moment();
            nextMinute.add(1, 'm').startOf('minute');

            // millis until next minute = next-minute - now
            const initialTimeout = moment.duration(nextMinute.diff(thisCandle)).as('milliseconds');
            initialCandleTimer(initialTimeout, candleTimeout, dataGatherer);
            websocket.on('message', (data) => {
                if(data.type === 'match'){
                    dataGatherer.send({ type: 'rawCandle', payload: data });
                }
            });

            websocket.on('error', (error) => {
                console.log("Error received on websocket", error);
            });

            websocket.on('close', (data) => {
                output('table', [data]);

                // try to re-connect the first time...
                websocket.connect();

                let count = 1;
                // attempt to re-connect every 30 seconds.
                // TODO: maybe use an exponential backoff instead
                const interval = setInterval(() => {
                    if (!websocket.socket) {
                        count++;

                        if (count % 30 === 0) {
                            const time_since = 30 * count;
                            console.log('Websocket Error', `Attempting to re-connect for the ${count} time. It has been ${time_since} seconds since we lost connection.`);
                        }
                        websocket.connect();
                    }
                    else {
                        clearInterval(interval);
                    }
                }, 30000);

            });
        });
}

if(commander.showCount && commander.candleSize) {
    const product = commander.showCount;
    const publicClient = AuthUtils.getPublicClient(commander.real);
    const granularity = gdax.determineGranularity(commander.candleSize);

    gdax.listHistoricRates(
            publicClient,
            determineOutputMode(commander),
            product,
            granularity)
        .then((rates) => {
            const rateObjs = _.map(rates, r => {
                return {
                    time: moment.unix(r[0]),
                    low: r[1],
                    high: r[2],
                    open: r[3],
                    close: r[4],
                    volume: r[5]
                }
            });

            if(commander.dump) {
                console.log("export const data = [");
                output('json', _.head( _.chunk(rateObjs, 50)));
                console.log("];");
            } else {
                if(!commander.combined) {
                    const bearishPrices = findCandlesSinceBearishFlip(rateObjs);
                    const bullishPrices = findCandlesSinceBullishFlip(rateObjs);
                    output('table', bearishPrices);
                    output('table', bullishPrices);
                } else {
                    const combined = findRecentCombinedBullishAndBearishCandles(rateObjs);
                    output('table', combined);
                }

            }


        });
}
