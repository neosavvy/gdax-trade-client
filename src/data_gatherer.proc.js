const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');

let historicCandles = [];
let rawCandleData = [];
let processingRawData = [];
let realtimeProcessing = [];

let openPositions = [];
let orders = [];


const {
    findRecentCombinedBullishAndBearishCandles,
    updateHistoryWithCounts
} = require('./util/demark.util');

const {
    calculateBeginningOfCandle
} = require('./util/candle_timer.utils');

const { output } = require('./util/logging.util');

const calculateNewCandle = (candleMoment, latestHistoricCandle, inProcessRawData) => {
    if( moment(latestHistoricCandle.time).diff(candleMoment) === 0 ) {

        const mergedLow = _.min([
            parseFloat(_.get(_.minBy(inProcessRawData, 'price'), 'price', NaN)),
            latestHistoricCandle.low
        ]);
        const mergedHigh = _.max([
            parseFloat(_.get(_.maxBy(inProcessRawData, 'price'), 'price', NaN)),
            latestHistoricCandle.high
        ]);
        const mergedOpen = latestHistoricCandle.open;
        const mergedClose = parseFloat(_.get(_.last(inProcessRawData, 'price'), 'price', NaN)) ||
            latestHistoricCandle.close;
        const mergedVolume = _.sumBy(inProcessRawData, (rawData) => {
            return parseFloat(rawData.size)
        }) + latestHistoricCandle.volume;


        return {
            time: candleMoment,
            low:   mergedLow,
            high:  mergedHigh,
            open:  mergedOpen,
            close: mergedClose,
            volume: mergedVolume,
        };
    }
    else {
        return {
            time: candleMoment,
            low:   parseFloat(_.get(_.minBy(inProcessRawData, 'price'), 'price', NaN)),
            high:  parseFloat(_.get(_.maxBy(inProcessRawData, 'price'), 'price', NaN)),
            open:  parseFloat(_.get(_.first(inProcessRawData, 'price'), 'price', NaN)),
            close: parseFloat(_.get(_.last(inProcessRawData, 'price'), 'price', NaN)),
            volume: _.sumBy(inProcessRawData, (rawData) => {
                return parseFloat(rawData.size)
            }),
        };
    }
};

const position = {
    symbol: 'BTC-USD',
    amount: 1.0031,
    costBasis: 7302.02
};

const hasLongPosition = (positions) => {
    const sum = _.sumBy(positions, 'amount');
    console.log('hasLongPosition: ', sum);
    return sum > 0;
};

const analyze = (currentCandle, history, positions) => {

    // considerations
    /*
    1. Assuming no positions, would it be wise to buy in the current candle tick
    2. Assuming a position
     a. Is your average cost basis less than the current price? (You are in profit)
        i. if yes, is there enough profit to do a market order?
        ii. if yes, is there enough profit to do a trailing stop loss at a safe distance?
        iii. Is there a strong indicator that we are statistically reaching the top of the current swing?
     b. Is your average cost basis greater than the current price? (You are losing)
        i. Is your average cost basis within a tolerable stop loss limit (-2%?)
        ii. Is your overall position exposing too much of your portfolio?
        iii. Is there a strong indicator that the market is about to go drastically further south
         (strong implication to cut loss and sell at a loss now)
     */


    const shouldLong = (currentCandle, history, positions) => {
        return  history[0].tdBuyCount === 9;
    };

    const shouldShort = (currentCandle, history, positions) => {
        return  history[0].tdSellCount === 9;
    };

    if( !hasLongPosition(positions) && shouldLong(currentCandle, history, positions) ) {
        return {
            symbol: 'BTC-USD',
            action: 'buy',
            amount: 1,
            price: currentCandle.price
        }
    }

    else if( hasLongPosition(positions) && shouldShort(currentCandle, history, positions) ) {
        return {
            symbol: 'BTC-USD',
            action: 'sell',
            amount:  _.sumBy(positions, 'amount'),
            price: currentCandle.price
        }
    }

    else {
        return {
            action: 'none',
            amount: _.sumBy(positions, 'amount'),
            price: currentCandle.price
        }
    }


};

const trade = (analysis, positions) => {
    const now = moment.utc().format();
    switch (analysis.action){
        case 'buy':
            if( !hasLongPosition(positions) )
            {
                console.log('Buying...', analysis);
                fs.appendFileSync('trades.csv',`${now},${analysis.action},${analysis.symbol},${analysis.amount},${-1 * analysis.price}\n`);
                return [analysis].concat(positions);
            } else {
                return positions || [];
            }
        case 'sell':
            if( hasLongPosition(positions) )
            {
                console.log('Selling...', analysis);
                fs.appendFileSync('trades.csv',`${now},${analysis.action},${analysis.symbol},${analysis.amount},${analysis.price}\n`);
                return _.tail(positions) || [];
            } else {
                return positions || [];
            }
        default:
            console.log("Not a trading opportunity");
            return positions || [];
    }
};

process.on('message', async (message) => {

    try {
        switch(message.type) {
            case "historicCandles":{
                if(message.payload) {
                    historicCandles = historicCandles.concat(_.first(_.chunk(message.payload, 100)));
                    console.log("Historic Data Received");
                    output('table', _.first(_.chunk(historicCandles, 20)), undefined, ['low', 'open', 'high']);
                }
                break;
            }
            case "rawCandle": {
                if (message.payload) {
                    rawCandleData = rawCandleData.concat(message.payload);
                    const latestHistoricCandle = historicCandles[0];
                    const candleMoment = calculateBeginningOfCandle(
                        message.candleSize,
                        message.payload.time);

                    realtimeProcessing = rawCandleData;
                    const newCandle = calculateNewCandle(
                        candleMoment,
                        latestHistoricCandle,
                        realtimeProcessing);

                    let realtimeHistory = [];
                    if( moment(latestHistoricCandle.time).diff(candleMoment) === 0 ) {
                        realtimeHistory = [newCandle].concat(_.tail(historicCandles));
                    } else {
                        realtimeHistory = [newCandle].concat(historicCandles);
                    }
                    realtimeHistory = updateHistoryWithCounts(
                        findRecentCombinedBullishAndBearishCandles(realtimeHistory)
                    );
                    output('table', _.first(_.chunk(realtimeHistory, 20)));
                    // openPositions = trade(
                    //     analyze(message.payload, realtimeHistory, openPositions),
                    //     openPositions
                    // );
                    // console.log("Positions after analyze+trade: ", openPositions);
                }
                break;
            }
            case "candleEnded": {
                const candleMoment = message.candleMoment;
                const latestHistoricCandle = historicCandles[0];

                console.log("End candle Received", candleMoment);
                processingRawData = rawCandleData;
                rawCandleData = [];

                const newCandle = calculateNewCandle(
                    candleMoment,
                    latestHistoricCandle,
                    processingRawData);

                if( moment(latestHistoricCandle.time).diff(candleMoment) === 0 ) {
                    historicCandles = [newCandle].concat(_.tail(historicCandles));
                } else {
                    historicCandles = [newCandle].concat(historicCandles);
                }
                historicCandles = updateHistoryWithCounts(
                    findRecentCombinedBullishAndBearishCandles(_.first(_.chunk(historicCandles, 100)))
                );

                processingRawData = [];
                output('table', _.first(_.chunk(historicCandles, 20)));
                break;
            }

        }
    } catch (error) {
        console.log("Error occurred at ", moment().format('MMMM Do YYYY, h:mm:ss a'));
        console.log("Error: ", error);
    }
});