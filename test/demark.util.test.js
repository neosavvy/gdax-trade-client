import {describe, it} from 'mocha';
import _ from 'lodash';
import {expect} from 'chai';
import {
    findCandlesSinceBearishFlip,
    findCandlesSinceBullishFlip,
    findRecentCombinedBullishAndBearishCandles,
    updateBearishHistoryWithCounts,
    updateBullishHistoryWithCounts,
    updateHistoryWithCounts,
    calculateCount
} from "../src/util/demark.util";

const { output } = require('../src/util/logging.util');


import { data } from './demark.data.1m.bugs';

describe('demark', () => {

    describe('findCandlesSinceBearishFlip', function () {
        it('should find the most recent candles since a bearish price flip',()=> {
            const bearishCandles = findCandlesSinceBearishFlip(data);
        });
    });

    describe('findCandlesSinceBullishFlip', function () {
        it('should find the most recent candles since a bearish price flip',()=> {
            const bullishCandles = findCandlesSinceBullishFlip(data);

        });
    });

    describe('updateBearishHistoryWithCounts', function() {
        it('should update the full history with current counts of bearish calls', () => {
            const history = findRecentCombinedBullishAndBearishCandles(data);
            // output('table', _.first(_.chunk(history, 30)));
            const updatedHistory = updateBearishHistoryWithCounts(history);
            expect(history.length).to.equal(updatedHistory.length);
            // output('table', _.first(_.chunk(updatedHistory, 200)));
        });
    });

    describe('updateBullishHistoryWithCounts', function() {
        it('should update the full history with current counts of bullish calls', () => {
            const history = findRecentCombinedBullishAndBearishCandles(data);
            // output('table', _.first(_.chunk(history, 30)));
            const updatedHistory = updateBullishHistoryWithCounts(history);
            expect(history.length).to.equal(updatedHistory.length);
            // output('table', _.first(_.chunk(updatedHistory, 200)));
        });
    });

    describe('updateHistoryWithCounts', function() {
        it('should update the full history with current counts of bullish calls', () => {
            const history = findRecentCombinedBullishAndBearishCandles(data);
            // output('table', _.first(_.chunk(history, 30)));
            const updatedHistory = updateHistoryWithCounts(history);
            expect(history.length).to.equal(updatedHistory.length);
            output('table', _.first(_.chunk(updatedHistory, 200)));
        });
    });

    describe('calculateCount', function() {
        it('should update the newest record based on the previous historical state', () => {

        })
    })
});