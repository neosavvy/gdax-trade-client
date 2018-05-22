const _ = require('lodash');
const moment = require('moment');

let historicCandles = [];
let rawCandleData = [];
let processingRawData = [];

const {
    findRecentCombinedBullishAndBearishCandles,
    updateHistoryWithCounts
} = require('./util/demark.util');

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
}

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
                }
                break;
            }
            case "candleEnded": {
                const candleMoment = message.candleMoment;
                const latestHistoricCandle = historicCandles[0];

                console.log("End candle Received", candleMoment);
                processingRawData = rawCandleData;
                rawCandleData = [];

                const newCandle = calculateNewCandle(candleMoment, latestHistoricCandle, processingRawData);
                if( moment(latestHistoricCandle.time).diff(candleMoment) === 0 ) {
                    historicCandles = [newCandle].concat(_.tail(historicCandles));
                } else {
                    historicCandles = [newCandle].concat(historicCandles);
                }
                historicCandles = updateHistoryWithCounts(
                    findRecentCombinedBullishAndBearishCandles(_.first(_.chunk(historicCandles, 100)))
                );

                processingRawData = [];
                output('table', _.first(_.chunk(historicCandles, 20)), undefined, ['low', 'open', 'high']);
                break;
            }

        }
    } catch (error) {
        console.log("Error occurred at ", moment().format('MMMM Do YYYY, h:mm:ss a'));
        console.log("Error: ", error);
    }
});