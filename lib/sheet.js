'use strict';

const _ = require('lodash');
const Aigle = require('aigle');

const Logger = require('./logger');

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

  constructor(info, formatter) {
    this.info = info;
    this.title = [];
    this.validation = [];
    this.data = [];
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
    const { formatter } = this;
    return !formatter ?
      _.map(this.data, data => _.transform(this.title, (result, title, index) => {
        result[title] = data[index];
      }, {})) :
      Aigle.map(this.data, data => Aigle.transform(this.title, async (result, title, index) => {
        result[title] = await formatter(data[index]);
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
    if (!this.validation) {
      return;
    }
    _.forEach(this.data, row => _.forEach(this.validation, (info, index) => {
      const [type, required] = info.split(':');
      let data = row[index];
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
        default:
          Logger.warn('Sheet:validate', `unknown type. type: ${type}`);
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
