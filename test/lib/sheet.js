'use strict';

const assert = require('assert');

const _ = require('lodash');

const dummy = require('../data/dummy');
const Sheet = require('../../lib/sheet')();

describe('Sheet', () => {
  beforeEach(() => {
    Sheet.defineTitle(1)
      .defineValidation(2)
      .defineFirstData(3);
  });

  describe('toObject', () => {
    it('should create an array of objects', () => {
      const sheet = new Sheet('dummy', dummy);
      assert.deepStrictEqual(sheet.toObject(), [
        {
          id: 1,
          name: 'dummy_1',
          type: 'dummy_type_1',
          order: 1
        },
        {
          id: 2,
          name: 'dummy_2',
          type: 'dummy_type_1',
          order: 2
        },
        {
          id: 3,
          name: 'dummy_3',
          type: 'dummy_type_1',
          order: 3
        },
        {
          id: 4,
          name: 'dummy_4',
          type: 'dummy_type_2',
          order: 4
        }
      ]);
    });

    it('should sort title', () => {
      Sheet.defineTitle(1, false, true);
      const sheet = new Sheet('dummy', dummy);
      const item = _.first(sheet.toObject());
      assert.deepStrictEqual(_.keys(item), ['id', 'name', 'order', 'type']);
    });
  });
});
