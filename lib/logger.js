'use strict';

const _ = require('lodash');

const SEVERITY = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

class Logger {
  /**
   * @param {Object} config
   * @param {Enum} [config.severity] - ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
   */
  static configure(config) {
    this.severity = _.indexOf(SEVERITY, config.severity);
    return this;
  }

  /**
   * @private
   */
  static log(severity, name, args) {
    if (severity < this.severity) {
      return;
    }
    const prefix = `[${new Date().toISOString()}:${
      SEVERITY[severity]
    }:${name}]`;
    const log = _.reduce(
      args,
      (memo, arg) => {
        memo += ' ';
        switch (typeof arg) {
          case 'object':
            memo += JSON.stringify(arg);
            break;
          default:
            memo += arg;
            break;
        }
        return memo;
      },
      prefix
    );
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

  static fatal(name, ...args) {
    this.log(4, name, args);
  }
}

module.exports = Logger.configure({ severity: SEVERITY[2] });
