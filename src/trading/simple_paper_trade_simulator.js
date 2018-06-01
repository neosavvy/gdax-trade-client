const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');


let realtimeHistory = [];
let openPositions = [{ symbol: 'BTC-USD',
    action: 'buy',
    amount: 1,
    price: '7545.96000000' }];
let orders = [];

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

    else if(
        hasLongPosition(positions) &&
        shouldShort(currentCandle, history, positions) &&
        parseFloat(currentCandle.price) > parseFloat(positions[0].price)
    ) {
        console.log("Current Candle Price: ", currentCandle.price);
        console.log("Postion Price:        ", positions[0].price);
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