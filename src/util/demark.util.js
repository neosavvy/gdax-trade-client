const _ = require('lodash');
const moment = require('moment');

/**
 * @param currentCandle Should be the 0th candle in an array or stream of candles
 * @param marketCandle Should be the 1st candle in an array or stream of candles
 * @param currentComparisonCandle Should be the 4th candle in an array or stream of candles
 * @param marketComparisonCandle Should be the 5th candle in an array or stream of candles
 * @returns {boolean}
 */
function isCandleBearish(currentCandle, marketCandle, currentComparisonCandle, marketComparisonCandle) {
    // console.log('isCandleBearish');
    // console.log('currentCandle', currentCandle);
    // console.log('marketCandle', marketCandle);
    // console.log('currentComparisonCandle', currentComparisonCandle);
    // console.log('marketComparisonCandle', marketComparisonCandle);
    return currentCandle.close <= currentComparisonCandle.close &&
        marketCandle.close >= marketComparisonCandle.close;
}

/**
 *
 * @param currentCandle Should be the 0th candle in an array or stream of candles
 * @param marketCandle Should be the 1st candle in an array or stream of candles
 * @param currentComparisonCandle Should be the 4th candle in an array or stream of candles
 * @param marketComparisonCandle Should be the 5th candle in an array or stream of candles
 * @returns {boolean}@returns {boolean}
 */
function isCandleBullish(currentCandle, marketCandle, currentComparisonCandle, marketComparisonCandle) {
    // console.log('isCandledBullish');
    // console.log('currentCandle', currentCandle);
    // console.log('marketCandle', marketCandle);
    // console.log('currentComparisonCandle', currentComparisonCandle);
    // console.log('marketComparisonCandle', marketComparisonCandle);
    return currentCandle.close >= currentComparisonCandle.close &&
        marketCandle.close <= marketComparisonCandle.close;
}

function isHistoryBearish(history) {
    const candle = history.pop();
    if (candle.isBearishPriceFlip) {
        return true;
    }

    return candle.tdBuyCount > 0;

}

function isHistoryBullish(history) {
    const candle = history.pop();
    if (candle.isBullishPriceFlip) {
        return true;
    }

    return candle.tdSellCount > 0;
}


/**
 * Bearish Price Flip - occurs when the market records a close greater
 * than the close four bars earlier, immediately followed by a close less
 * than the close four bars earlier.
 * @param candles
 */
function findCandlesSinceBearishFlip(candles) {
   // is close of current candle greater than 4 candles previous
   // is previousClose less than current minus 5
    let currentCandleIndex = 0;
    let bearishFound = false;

    const candleDataLength = candles.length;

    return _.reduce(candles, (acc, currentCandle) => {
        if(bearishFound) {
            return acc;
        }

        const indicesNeeded = (currentCandleIndex + 5);
        if( indicesNeeded < candleDataLength ){
            const isBearishPriceFlip = isCandleBearish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );
            bearishFound = isBearishPriceFlip ? true : false;

            const updatedCandle = _.merge({}, {isBearishPriceFlip}, currentCandle);
            currentCandleIndex=currentCandleIndex+1;
            return acc.concat(updatedCandle);
        }
        else {
            return acc;
        }
    }, []);
}

/**
 * Bullish Price Flip - occurs when the market records a close less than
 * the close four bars before, immediately followed by a close greater
 * than the close four bars earlier.
 * @param candles
 * @returns {*}
 */
function findCandlesSinceBullishFlip(candles) {
    let currentCandleIndex = 0;
    let bullishPriceFound = false;

    const candleDataLength = candles.length;

    return _.reduce(candles, (acc, currentCandle) => {
        if(bullishPriceFound) {
            return acc;
        }

        const indicesNeeded = (currentCandleIndex + 5);
        if( indicesNeeded < candleDataLength ){
            const bullishPriceFlip = isCandleBullish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );
            bullishPriceFound = bullishPriceFlip ? true : false;

            const updatedCandle = _.merge({}, {isBullishPriceFlip: bullishPriceFlip}, currentCandle);
            currentCandleIndex=currentCandleIndex+1;
            return acc.concat(updatedCandle);
        }
        else {
            return acc;
        }
    }, []);
}

function findRecentCombinedBullishAndBearishCandles(candles) {
    let currentCandleIndex = 0;
    const candleDataLength = candles.length;

    return _.reduce(candles, (acc, currentCandle) => {

        const indicesNeeded = (currentCandleIndex + 5);
        if( indicesNeeded < candleDataLength ){
            const isBearishPriceFlip = isCandleBearish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );

            const bullishPriceFlip = isCandleBullish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );

            const updatedCandle = _.merge({}, {
                time: moment.utc(currentCandle.time).format(),
                isBullishPriceFlip: bullishPriceFlip,
                isBearishPriceFlip: isBearishPriceFlip
            }, currentCandle);
            currentCandleIndex=currentCandleIndex+1;
            return acc.concat(updatedCandle);
        }
        else {
            return acc;
        }
    }, []);
}


/**
 * TD Buy Countdown starts after the finish of a buy setup.
 *  - The close of bar 9 should be less than the low two bars earlier.
 *  - If satisfied bar 9 of the setup becomes bar 1 of the countdown. If the condition is not met than bar 1 of the countdown
 *    is postponed until the conditions is satisfied and you continue to count until there are a total of thirteen closes,
 * each one less than, or equal to, the low two bars earlier.
 *
 * Countdown qualifier - The low of Countdown bar thirteen must be less than, or equal to, the close of Countdown bar eight.
 *
 * Countdown cancellation:
 *  - A sell Setup appears. The price has rallied in the opposite direction and the market dynamic has changed.
 *  - close above the highest high for the current buy Setup (break of TDST for the current Setup)
 *  - recycle occurs ( new Setup in the same direction and recycle activated )
 * @param history
 * @returns {Array}
 */
function updateBearishHistoryWithCounts(history) {
    const reversedHistory = _.reverse(history);

    let inCount = false;
    let currCount = 0;
    // start with oldest record and work your way forward
    let i, j;
    for(i = 4, j = 0; i < reversedHistory.length; i++, j++){
        // if record is a bearish price flip begin accumulating / counting
        const currentCandle = reversedHistory[i];
        const compareCandle = reversedHistory[j];

        if(currentCandle.isBearishPriceFlip) {
            inCount = true;
            currCount = 0;
        }
        // if record causes a cancel reset
        if(currentCandle.isBullishPriceFlip) {
            inCount = false;
            currCount = 0;
        }
        // if record is 9 - reset
        if(currCount === 9) {
            inCount = false;
            currCount = 0;
        }

        if(currentCandle.close < compareCandle.close) {
            currCount++;
            currentCandle.tdBuyCount = currCount;
        } else {
            currentCandle.tdBuyCount = 0;
        }
    }

    return _.reverse(reversedHistory);
}

/**
 * TD Sell Countdown starts after the finish of a sell setup.
 *  - The close of bar 9 should be greater than the high two bars earlier. If satisfied bar 9 of the setup becomes bar 1 of the countdown.
 *  - If the condition is not met than bar 1 of the countdown is postponed until the conditions is satisfied and you continue
 *    to count until there are a total of thirteen closes, each one greater than, or equal to, the high two bars earlier.
 *
 * Countdown qualifier - The high of Countdown bar thirteen must be greater than, or equal to, the close of Countdown bar eight.
 *
 * Countdown cancellation:
 *  - A buy Setup appears. The price has rallied in the opposite direction and the market dynamic has changed.
 *  - close below the lowest low for the current sell Setup(break of TDST for the current Setup)
 *  - recycle occurs (new Setup in the same direction and recycle activated)
 *
 * @param history
 * @returns {Array|Object}
 */
function updateBullishHistoryWithCounts(history) {
    const reversedHistory = _.reverse(history);

    let inCount = false;
    let currCount = 0;
    // start with oldest record and work your way forward
    let i, j;
    for(i = 4, j = 0; i < reversedHistory.length; i++, j++){
        // if record is a bearish price flip begin accumulating / counting
        const currentCandle = reversedHistory[i];
        const compareCandle = reversedHistory[j];

        if(currentCandle.isBullishPriceFlip) {
            inCount = true;
            currCount = 0;
        }
        // if record causes a cancel reset
        if(currentCandle.isBearishPriceFlip) {
            inCount = false;
            currCount = 0;
        }
        // if record is 9 - reset
        if(currCount === 9) {
            inCount = false;
            currCount = 0;
        }

        if(currentCandle.close > compareCandle.close) {
            currCount++;
            currentCandle.tdSellCount = currCount;
        } else {
            currentCandle.tdSellCount = 0;
        }
    }

    return _.reverse(reversedHistory);
}

function updateHistoryWithCounts(history) {
    const updatedBullish = updateBullishHistoryWithCounts(history);
    const updatedBearish = updateBearishHistoryWithCounts(updatedBullish);
    return updatedBearish;
}


function calculateCount(candle, history) {
    if(candle.isBullishPriceFlip) {
        return {
            tdSellCount: 1,
            tdBuyCount: 0
        }
    }

    if(candle.isBearishPriceFlip) {
        return {
            tdSellCount: 0,
            tdBuyCount: 1
        }
    }

    const previousCandle = history[0];
    const compareCandle = history[4];
    // console.log("P:", previousCandle);
    // console.log("C:", compareCandle);
    if(previousCandle.tdBuyCount > 0) {
        // we are continuing buy trend counting
        if(candle.close <= compareCandle.close) {
            return {
                tdSellCount: 0,
                tdBuyCount: previousCandle.tdBuyCount + 1 || 1
            }
        } else {
            return {
                tdSellCount: 0,
                tdBuyCount: 0
            }
        }
    }

    if(previousCandle.tdSellCount > 0) {
        // we are continuing sell trend counting
        if(candle.close >= compareCandle.close) {
            return {
                tdSellCount: previousCandle.tdSellCount + 1 || 1,
                tdBuyCount: 0
            }
        } else {
            return {
                tdSellCount: 0,
                tdBuyCount: 0
            }
        }
    }

    throw new Error(`Illegal State, ${JSON.stringify(previousCandle)} has no tdBuyCount or tdSellCount`);
}

module.exports =  {
    findCandlesSinceBearishFlip,
    findCandlesSinceBullishFlip,
    findRecentCombinedBullishAndBearishCandles,
    isCandleBearish,
    isCandleBullish,
    isHistoryBearish,
    isHistoryBullish,
    updateBearishHistoryWithCounts,
    updateBullishHistoryWithCounts,
    updateHistoryWithCounts,
    calculateCount
};