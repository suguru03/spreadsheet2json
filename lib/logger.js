'use strict';

const _ = require('lodash');

class Logger {

  /**
   * @private
   */
  static log(severity, name, args) {
    // if (!process.env.DEBUG_SPREADSHEET2JSON) {
    //   return;
    // }
    const log = _.reduce(args, (memo, arg) => {
      return memo + JSON.stringify(arg);
    }, `[${new Date().toISOString()}:${severity.toUpperCase()}:${name}]`);
    console.log(log);
  }

  static debug(name, ...args) {
    this.log('debug', name, args);
  }

  static info(name, ...args) {
    this.log('info', name, args);
  }

  static warn(name, ...args) {
    this.log('warn', name, args);
  }

  static error(name, ...args) {
    this.log('error', name, args);
  }
}

module.exports = Logger;
