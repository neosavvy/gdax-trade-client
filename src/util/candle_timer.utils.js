const moment = require('moment');
require('moment-round');


function initialCandleTimer(initialTimeout, candleTimeout, dataGatherer){
    console.log("Initial Timeout: ", initialTimeout);
    console.log("Initial Timeout: ", candleTimeout);

    const thisCandle = new moment().utc().startOf('minute');
    let timeout = setTimeout(() => {
        console.log("Data Ending for Initial Candle, sending notification", thisCandle.toISOString());
        dataGatherer.send({ type: 'candleEnded', candleMoment: thisCandle });
        configureCandleTimer(candleTimeout, dataGatherer, timeout);
    }, initialTimeout);
    return timeout;
}

function configureCandleTimer(candleTimeout, dataGatherer, oldTimeout = null) {
    // set a timer based on granularity
    // upon expired timer send message to data gather to push data as a candle onto cached candles
    // reset / restart timer
    const thisCandle = new moment().utc().startOf('minute');
    if( oldTimeout ) {
        clearTimeout(oldTimeout);
    }
    let timeout = setTimeout(() => {
        console.log("Data Ending for Candle, sending notification", thisCandle.toISOString());
        dataGatherer.send({ type: 'candleEnded', candleMoment: thisCandle });
        configureCandleTimer(candleTimeout, dataGatherer, timeout);
    }, candleTimeout);
    return timeout
}

function calculateInitialTimeoutForCandleSize(candleSize, thisCandle = new moment()) {
    switch( candleSize ) {
        case "1m":
            const nextMinute = new moment();
            nextMinute.add(1, 'm').startOf('minute');
            return moment.duration(nextMinute.diff(thisCandle)).as('milliseconds');
        case "5m":
            const next5Minute = new moment().ceil(5, 'minutes');
            console.log('next: ', next5Minute);
            return moment.duration(next5Minute.diff(thisCandle)).as('milliseconds');
        case "15m":
            const next15Minute = new moment().ceil(15, 'minutes');
            console.log('next: ', next15Minute);
            return moment.duration(next15Minute.diff(thisCandle)).as('milliseconds');
        case "1h":
            const next1hour = new moment().ceil(1, 'hours');
            console.log('next: ', next1hour);
            return moment.duration(next1hour.diff(thisCandle)).as('milliseconds');
        case "6h":
            const next6hour = new moment().ceil(6, 'hours');
            console.log('next: ', next6hour);
            return moment.duration(next6hour.diff(thisCandle)).as('milliseconds');
        case "1d":
            const next1day = new moment();
            next1day.add(1, 'd').startOf('day');
            console.log('next: ', next1day);
            return moment.duration(next1day.diff(thisCandle)).as('milliseconds');
    }
}

function calculateBeginningOfThisCandle(candleSize) {
    const thisCandle = new moment();
    switch( candleSize ) {
        case "1m":
            thisCandle.startOf('minute');
            break;
        case "5m":
            thisCandle.floor(5, 'minutes');
            break;
        case "15m":
            thisCandle.floor(15, 'minutes');
            break;
        case "1h":
            thisCandle.floor(1, 'hours');
            break;
        case "6h":
            thisCandle.floor(6, 'hours');
            break;
        case "1d":
            thisCandle.startOf('day');
            break;
    }
    return thisCandle
}

module.exports = {
    initialCandleTimer,
    calculateInitialTimeoutForCandleSize
};