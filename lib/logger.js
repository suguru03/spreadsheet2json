'use strict';

const _ = require('lodash');

const SEVERITY = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

class Logger {

  /**
   * @param {Object} config
   * @param {Enum} [config.severity] - ['DEBUG', 'INFO', 'WARN', 'ERROR']
   */
  static configure(config) {
    this.severity = _.indexOf(SEVERITY, config.severity);
  }

  /**
   * @private
   */
  static log(severity, name, args) {
    if (severity < (_.isNumber(this.severity) ? this.severity : 3)) {
      return;
    }
    const prefix = `[${new Date().toISOString()}:${SEVERITY[severity]}:${name}]`;
    const log = _.reduce(args, (memo, arg) => memo + JSON.stringify(arg), prefix);
    console.log(log); // eslint-disable-line no-console
  }

  static debug(name, ...args) {
    this.log(0, name, args);
  }

  static info(name, ...args) {
    this.log(1, name, args);
  }

  static warn(name, ...args) {
    this.log(2, name, args);
  }

  static error(name, ...args) {
    this.log(3, name, args);
  }
}

module.exports = Logger;
