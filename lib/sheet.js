'use strict';

const _ = require('lodash');

const validators = {};
const formatters = {};

class Sheet {

  static setValidator(key, validator) {
    validators[key] = validator;
  }

  static setValidators(object) {
    _.forOwn(object, (validator, key) => this.setValidator(key, validator));
  }

  static setFormatter(key, formatter) {
    formatters[key] = formatter;
  }

  static setFormatters(object) {
    _.forOwn(object, (formatter, key) => this.setFormatter(key, formatter));
  }

  constructor(info) {
    this.info = info;
  }
}
module.exports = Sheet;
