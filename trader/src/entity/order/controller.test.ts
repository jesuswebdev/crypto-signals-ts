import { Server } from '@hapi/hapi';
import { getOrderFromDbOrBinance } from './controller';
import { OrderAttributes } from '@jwd-crypto-signals/common';

describe('Order Controller tests', () => {
  let server: unknown;
  
  // describe('Create Buy Order Tests', () => {});
  // describe('Create Sell Order Tests', () => {});
  // describe('setOrderTimeout Tests', () => {});
  // describe('checkHeaders Tests', () => {});
  describe('getOrderFromDbOrBinance Tests', () => {
    it('should fail when no order is passed', () => {
      let order: unknown;
      expect(
        getOrderFromDbOrBinance(server as Server, order as OrderAttributes)
      ).rejects.toThrow();
    });

    // finds order in database

    // does not find order in database and queries binance returns order

    // does not find order in database nor binance

  });
});
