'use strict';

const _ = require('lodash');

const Logger = require('./logger');
const { DELETE } = require('./util');

module.exports = function getSheet() {

  // TODO
  return class Sheet {

    static defineTitle(line, vartical, sort = false) {
      this.title = {
        line: --line,
        vartical,
        sort
      };
      return this;
    }

    static defineFirstData(firstData) {
      this.firstData = --firstData;
      return this;
    }

    static defineValidation(line) {
      this.validation = --line;
      return this;
    }

    /**
     * @param {string} name
     * @param {Object} info
     */
    constructor(name, info, { filter, validator, formatter } = {}) {
      this.name = name;
      this.info = info;
      this.title = [];
      this.validation = [];
      this.data = [];
      this.filter = filter;
      this.validator = validator;
      this.formatter = formatter;
      this.resolve();
      this.validate();
    }

    getInfo() {
      return this.info;
    }


    getGrid() {
      return this.info.values;
    }

    toObject() {
      const {
        formatter = v => v,
        validation,
        title
      } = this;
      // TODO improve logic
      const indexes = _.times(title.length);
      Sheet.title.sort && indexes.sort((n1, n2) => title[n1] < title[n2] ? -1 : 1);

      return _.map(this.data, data => _.transform(indexes, (result, index) => {
        const formatted = formatter(data[index], validation[index], this.name, this.title[index]);
        if (formatted === DELETE) {
          return;
        }
        result[title[index]] = formatted;
      }, {}));

    }

    async toJSON() {
      return JSON.stringify(await this.toObject());
    }

    /**
     * @private resolve data
     */
    resolve() {
      // TODO vartical
      this.title = this.info.values[Sheet.title.line];
      this.validation = this.info.values[Sheet.validation] || [];
      this.data = _.chain(this.info.values)
        .slice(Sheet.firstData)
        .filter(this.filter)
        .value();
    }

    /**
     * @private
     */
    validate() {
      const { validation, validator } = this;
      if (!validation.length && !validator) {
        return;
      }
      const validationInfo = _.map(validation, info => info.split(':'));
      _.forEach(this.data, row => _.forEach(row, (data, index) => {
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
            data = /true/i.test(data);
            row[index] = data;
            return this.validateData(_.isBoolean, required, data, index);
          default:
            if (validator) {
              if (validator(data, validation[index], this.name, this.title[index])) {
                return;
              }
              Logger.warn('Sheet:validate', `Custom validation failed. name: ${this.name}, type: ${type}, data: ${data}`);
            } else {
              Logger.warn('Sheet:validate', `unknown type. name: ${this.name}, type: ${type}`);
            }
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
      Logger.error('Sheet:validateData', `Validation is failed. ${data} should be ${type}. sheet: ${this.name}, title: ${title}, index: ${index}`);
    }
  }
};
