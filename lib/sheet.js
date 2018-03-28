'use strict';

const _ = require('lodash');

const Logger = require('./logger');
const { DELETE } = require('./util');

class Sheet {
  /**
   * @param {string} name
   * @param {Object} info - it is from spreadsheet api
   * @param {Object} options
   */
  constructor(
    name,
    info,
    {
      filter = v => v,
      formatter = v => v,
      validator,
      vartical = false,
      sort = false,
      titleLine = 1,
      validationLine = 2,
      firstLine = 3
    } = {}
  ) {
    this.name = name;
    this.info = info;
    this.title = [];
    this.validation = [];
    this.data = [];
    this.options = {
      filter,
      validator,
      formatter,
      vartical,
      sort,
      titleLine,
      validationLine,
      firstLine
    };
  }

  flush() {
    this.title = [];
    this.validation = [];
    this.data = [];
    return this;
  }

  defineTitleLine(
    line = this.options.titleLine,
    { vartical = this.options.vartical, sort = this.options.sort } = {}
  ) {
    this.options.titleLine = line;
    this.options.vartical = vartical;
    this.options.sort = sort;
    return this.flush();
  }

  defineFirstLine(line = this.options.firstLine) {
    this.options.firstLine = line;
    return this.flush();
  }

  defineValidationLine(line = this.options.validateLine) {
    this.options.validationLine = line;
    return this.flush();
  }

  getInfo() {
    return this.info;
  }

  getGrid() {
    return this.info.values;
  }

  toObject() {
    this.createData();
    const { title, validation, options: { formatter } } = this;
    const indexes = _.times(title.length);
    this.options.sort &&
      indexes.sort((n1, n2) => (title[n1] < title[n2] ? -1 : 1));

    return _.map(this.data, data =>
      _.transform(
        indexes,
        (result, index) => {
          const formatted = formatter(
            data[index],
            validation[index],
            this.name,
            title[index]
          );
          if (formatted === DELETE) {
            return;
          }
          result[title[index]] = formatted;
        },
        {}
      )
    );
  }

  toJSON() {
    return JSON.stringify(this.toObject());
  }

  /**
   * @private
   */
  createData() {
    if (this.title.length) {
      return this;
    }
    // TODO vartical
    const {
      info,
      options: { filter, titleLine, validationLine, firstLine }
    } = this;
    this.title = info.values[titleLine - 1];
    this.validation = info.values[validationLine - 1] || [];
    this.data = _.chain(info.values)
      .slice(firstLine - 1)
      .filter(filter)
      .value();
    return this.validate();
  }

  /**
   * @private
   */
  validate() {
    const { validation, options: { validator } } = this;
    if (!validation.length && !validator) {
      return this;
    }
    const validationInfo = _.map(validation, info => info.split(':'));
    _.forEach(this.data, row =>
      _.forEach(row, (data, index) => {
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
              if (
                validator(data, validation[index], this.name, this.title[index])
              ) {
                return;
              }
              Logger.warn(
                'Sheet:validate',
                `Custom validation failed. name: ${
                  this.name
                }, type: ${type}, data: ${data}`
              );
            } else {
              Logger.warn(
                'Sheet:validate',
                `unknown type. name: ${this.name}, type: ${type}`
              );
            }
        }
      })
    );
    return this;
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
    Logger.error(
      'Sheet:validateData',
      `Validation is failed. ${data} should be ${type}. sheet: ${
        this.name
      }, title: ${title}, index: ${index}`
    );
  }
}

module.exports = Sheet;
