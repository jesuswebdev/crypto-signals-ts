import { describe, it } from 'mocha';
import { expect } from 'chai';

import { nz } from '../src/index';

function getNullValue(): unknown {
  return null;
}

function getUndefinedValue(): unknown {
  return undefined;
}

describe('Index file functions tests', function () {
  describe('nz() tests', function () {
    it('returns zero when value is Infinity', function () {
      const result = nz(Infinity);
      expect(result).to.eq(0);
    });

    it('returns zero when value is -Infinity', function () {
      const result = nz(-Infinity);
      expect(result).to.eq(0);
    });

    it('returns zero when value is NaN', function () {
      const result = nz(NaN);
      expect(result).to.eq(0);
    });

    it('returns zero when value is undefined', function () {
      const value = getUndefinedValue();
      const result = nz(value as number);
      expect(result).to.eq(0);
    });

    it('returns zero when value is null', function () {
      const value = getNullValue();
      const result = nz(value as number);
      expect(result).to.eq(0);
    });

    it('returns the supplied number when value is invalid', function () {
      const value = NaN;
      const supplied = 1337;
      const result = nz(value, supplied);
      expect(result).to.eq(supplied);
    });

    it('returns the value if it is valid', function () {
      const value = 1;
      const result = nz(value);
      expect(result).to.eq(value);
    });
  });
});
