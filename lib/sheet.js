'use strict';

const _ = require('lodash');
const Aigle = require('aigle');

const Logger = require('./logger');
const { DELETE } = require('./util');

class Sheet {

  static defineTitle(line, firstData, vartical) {
    this.title = {
      line: --line,
      firstData: --firstData,
      vartical
    };
  }

  static defineValidation(line) {
    this.validation = --line;
  }

  constructor(info, validator, formatter) {
    this.info = info;
    this.title = [];
    this.validation = [];
    this.data = [];
    this.validator = validator;
    this.formatter = formatter;
    this.resolve();
    this.validate();
  }

  getInfo() {
    return this.info;
  }


  getMatrix() {
    return this.info.values;
  }

  toObject() {
    const { formatter, validation } = this;
    return !formatter ?
      _.map(this.data, data => _.transform(this.title, (result, title, index) => {
        result[title] = data[index];
      }, {})) :
      Aigle.map(this.data, data => Aigle.transform(this.title, async (result, title, index) => {
        data = await formatter(data[index], validation[index]);
        if (data === DELETE) {
          return;
        }
        result[title] = data;
      }, {}));
  }

  toJSON() {
    return JSON.stringify(this.toObject());
  }

  /**
   * @private resolve data
   */
  resolve() {
    // TODO vartical
    this.title = this.info.values[Sheet.title.line];
    this.validation = this.info.values[Sheet.validation];
    this.data = this.info.values.slice(Sheet.title.firstData);
  }

  /**
   * @private
   */
  validate() {
    const { validation, validator } = this;
    if (!validation && !validator) {
      return;
    }
    const validationInfo = _.map(validation, info => info.split(':'));
    _.forEach(this.data, row => _.forEach(row, (data, index) => {
      if (validator) {
        validator(data, validation[index]);
      }
      const [type, required] = validationInfo[index] || [];
      switch (type) {
        case 'string':
          return this.validateData(_.isString, required, data, index);
        case 'int':
        case 'integer':
          data = data == null || data === '' ? undefined : +data;
          row[index] = data;
          return this.validateData(_.isInteger, required, data, index);
        case 'float':
        case 'double':
        case 'number':
          data = data == null || data === '' ? undefined : +data;
          row[index] = data;
          return this.validateData(_.isNumber, required, data, index);
        case 'boolean':
          return this.validateData(_.isBoolean, required, data, index);
        default:
          !validator && Logger.warn('Sheet:validate', `unknown type. type: ${type}`);
      }
    }));
  }

  /**
   * @private
   */
  validateData(validator, required, data, index) {
    if (!required && data == null) {
      return;
    }
    if (validator(data)) {
      return;
    }
    const title = this.title[index];
    const type = this.validation[index];
    throw new Error(`Validation is failed. ${data} should be ${type}. title: ${title}, index: ${index}`);
  }
}

module.exports = Sheet;
