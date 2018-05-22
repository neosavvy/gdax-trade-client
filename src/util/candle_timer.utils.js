const moment = require('moment');
require('moment-round');


function initialCandleTimer(initialTimeout, candleTimeout, dataGatherer){
    const thisCandle = new moment().utc();
    thisCandle.add(initialTimeout);
    thisCandle.startOf('minute');

    console.log("Will Send Candle with value: ", thisCandle);
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
    const thisCandle = new moment().utc();
    thisCandle.add(candleTimeout);
    thisCandle.startOf('minute');

    console.log("Next Update In: ", moment.duration(candleTimeout).humanize());

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
            return moment.duration(nextMinute.diff(thisCandle)).as('milliseconds');
        case "5m":
            const next5Minute = new moment().ceil(5, 'minutes');
            return moment.duration(next5Minute.diff(thisCandle)).as('milliseconds');
        case "15m":
            const next15Minute = new moment().ceil(15, 'minutes');
            return moment.duration(next15Minute.diff(thisCandle)).as('milliseconds');
        case "1h":
            const next1hour = new moment().ceil(1, 'hours');
            return moment.duration(next1hour.diff(thisCandle)).as('milliseconds');
        case "6h":
            const next6hour = new moment().ceil(6, 'hours');
            return moment.duration(next6hour.diff(thisCandle)).as('milliseconds');
        case "1d":
            const next1day = new moment();
            next1day.add(1, 'd').startOf('day');
            return moment.duration(next1day.diff(thisCandle)).as('milliseconds');
    }
}

module.exports = {
    initialCandleTimer,
    calculateInitialTimeoutForCandleSize
};