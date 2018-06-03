const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');


let realtimeHistory = [];
let openPositions = [];

const hasLongPosition = (positions) => {
    const sum = _.sumBy(positions, 'amount');
    console.log('hasLongPosition: ', sum);
    return sum > 0;
};

const isAggressive = false;

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
        if(isAggressive) {
            console.log("Should long is going to return: ", history[0].tdBuyCount > 0);
            return  history[0].tdBuyCount > 0;
        } else {
            return  history[0].tdBuyCount === 9;
        }
    };

    const shouldShort = (currentCandle, history, positions) => {
        if(isAggressive) {
            console.log("Should short is going to return: ", history[0].tdSellCount > 0);
            return  history[0].tdSellCount > 0;

        } else {
            return  history[0].tdSellCount > 4;
        }
    };

    if( !hasLongPosition(positions) && shouldLong(currentCandle, history, positions) ) {
        return {
            symbol: 'BTC-USD',
            action: 'buy',
            amount: 1,
            price: currentCandle.price
        }
    }

    else if( hasLongPosition(positions) && shouldLong(currentCandle, history, positions) ) {
        return {
            symbol: 'BTC-USD',
            action: 'buy',
            amount: _.sumBy(positions, 'amount') * 2,
            price: currentCandle.price
        }
    }

    else if(
        hasLongPosition(positions) &&
        shouldShort(currentCandle, history, positions) &&
        parseFloat(currentCandle.price) > parseFloat(positions[0].costBasis) * 1.001
    ) {
        console.log("Current Candle Price: ", currentCandle.price);
        console.log("Position Price:        ", positions[0].price);

        // determine the best price to try to sell
        // option 1: the max of the previous run up candles (ie if on a 4 count the high of candle 1-4)
        // option 2: the max of 13, 26, 50 or 100 period moving average

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
                // consider saving the price as 1.0050 to account for the fee when concatenating the postion
                const updated = _.merge({}, analysis, { costBasis: parseFloat(analysis.price) * 1.0050 });
                fs.appendFileSync('trades.csv',`${now},${analysis.action},${analysis.symbol},${analysis.amount},${-1 * analysis.price},${-1 * updated.costBasis}\n`);
                return [updated].concat(positions);
            } else {
                return positions || [];
            }
        case 'sell':
            if( hasLongPosition(positions) )
            {
                console.log('Selling...', analysis);
                fs.appendFileSync('trades.csv',`${now},${analysis.action},${analysis.symbol},${analysis.amount},${analysis.price},${analysis.price}\n`);
                return _.tail(positions) || [];
            } else {
                return positions || [];
            }
        default:
            console.log("Not a trading opportunity");

            // if hasLongPosition is true
            // and price has crossed below the low of the 9 candles that represented the buy in
            // make a decision
            // option 1: martingale if it is a continuation count of the 9 candles used to buy in (ie 10,11,12,13 and so on)
            // option 2: place a limit order to sell at the low of the 9 candles used to buy in
            // (implied that we save a collection to the position for the 9 candles used for the buy in)

            return positions || [];
    }
};

const analyzeAndTrade = (currentCandle) => {
    console.log('current:', currentCandle);
    openPositions = trade(
        analyze(currentCandle, realtimeHistory, openPositions),
        openPositions
    );
    console.log("Positions after analyze+trade: ", openPositions);
};

const updateRealtime = (history) => {
    realtimeHistory = history;
};

module.exports = {
    analyzeAndTrade,
    updateRealtime
};