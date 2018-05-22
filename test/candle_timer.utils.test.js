import {describe, it} from 'mocha';
import _ from 'lodash';
import moment from 'moment';
require('moment-round');

import {expect} from 'chai';
const { output } = require('../src/util/logging.util');
import { calculateInitialTimeoutForCandleSize } from '../src/util/candle_timer.utils';

describe('candle_timer', () => {

    describe('calculateInitialTimeoutForCandleSize', () => {

        it('should figure out the right amount of time between a passed in partial minute and the next minute', () => {
            const thisCandle = new moment();
            thisCandle.startOf('minute');
            thisCandle.add(20, 's');
            const timeoutMillis = calculateInitialTimeoutForCandleSize('1m', thisCandle);
            expect(timeoutMillis).to.equal(40 * 1000);
        });

        it('should figure out the right amount of time between a passed in partial 5-minute candle and the next one', () => {
            const thisCandle = new moment().floor(5, 'minutes');
            thisCandle.add(20, 's');
            const timeoutMillis = calculateInitialTimeoutForCandleSize('5m', thisCandle);
            expect(timeoutMillis).to.equal((40 * 1000) + (4 * 60 * 1000));
        });

        it('should figure out the right amount of time between a passed in partial 15-minute candle and the next one', () => {
            const thisCandle = new moment().floor(15, 'minutes');
            thisCandle.add(20, 's');
            const timeoutMillis = calculateInitialTimeoutForCandleSize('15m', thisCandle);
            expect(timeoutMillis).to.equal((40 * 1000) + (14 * 60 * 1000));
        });

        it('should figure out the right amount of time between a passed in partial 1-hour candle and the next one', () => {
            const thisCandle = new moment().floor(1, 'hours');
            thisCandle.add(20, 's');
            const timeoutMillis = calculateInitialTimeoutForCandleSize('1h', thisCandle);
            expect(timeoutMillis).to.equal((40 * 1000) + (59 * 60 * 1000));
        });

        it('should figure out the right amount of time between a passed in partial 6-hour candle and the next one', () => {
            const thisCandle = new moment().floor(6, 'hours');
            thisCandle.add(20, 's');
            const timeoutMillis = calculateInitialTimeoutForCandleSize('6h', thisCandle);
            expect(timeoutMillis).to.equal((40 * 1000) + (59 * 60 * 1000) + (5 * 60 * 60 * 1000));
        });

        it('should figure out the right amount of time between a passed in partial 1-day candle and the next one', () => {
            const thisCandle = new moment();
            thisCandle.startOf('day');
            thisCandle.add(20, 's');
            const timeoutMillis = calculateInitialTimeoutForCandleSize('1d', thisCandle);
            expect(timeoutMillis).to.equal((40 * 1000) + (59 * 60 * 1000) + (23 * 60 * 60 * 1000));
        })

    })

});