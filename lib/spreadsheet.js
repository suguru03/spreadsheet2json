'use strict';

const url = require('url');
const http = require('http');

const _ = require('lodash');
const open = require('open');
const Aigle = require('aigle');
const google = require('googleapis');
const sheets = google.sheets('v4');

const Logger = require('./logger');
const getSheet = require('./sheet');
const { convertNumberToSheetTitle } = require('./util');
const PROCESSING = () => {};

Aigle.promisifyAll(google.auth.OAuth2);
Aigle.promisifyAll(sheets.spreadsheets);

const SCOPE = ['https://spreadsheets.google.com/feeds'];

class Spreadsheet {
  /**
   * @param {Object} params
   * @param {string} params.client_id
   * @param {string} params.client_secret
   * @param {string} params.redirect_url
   * @param {number} [params.port]
   * @param {string} [params.token]
   * @param {Object|string} [params.token]
   * @param {string[]} [params.scope=['https://spreadsheets.google.com/feeds']]
   */
  static configure({
    client_id,
    client_secret,
    redirect_url,
    port,
    token,
    scope
  }) {
    this.config = {
      client_id,
      client_secret,
      redirect_url,
      port,
      token,
      scope
    };
  }

  /**
   * @private
   */
  static getPort(port) {
    return port || _.get(this.config, ['port'], 80);
  }

  /**
   * @private
   */
  static getRedirectUrl(redirectUrl, port = this.getPort()) {
    redirectUrl =
      redirectUrl || _.get(this.config, ['redirect_url'], 'http://localhost');
    return !port ? redirectUrl : `${redirectUrl}:${port}`;
  }

  /**
   * @param {Object} params
   * @param {string} params.spreadsheet_id
   * @param {string} [params.client_id]
   * @param {string} [params.client_secret]
   * @param {string} [params.redirect_url]
   * @param {number} [params.port]
   * @param {string|Object} [params.token]
   * @param {string[]} [params.scope=['https://spreadsheets.google.com/feeds']]
   */
  constructor({
    client_id,
    client_secret,
    spreadsheet_id,
    redirect_url,
    port,
    token,
    scope
  }) {
    this.spreadsheetId = spreadsheet_id;
    this.Sheet = getSheet();
    this.sheetInfo = undefined;
    const config = Spreadsheet.config || {};
    this.token = token || config.token;
    this.scope = scope || config.scope || SCOPE;
    this.port = Spreadsheet.getPort(port);
    this.auth = new google.auth.OAuth2(
      client_id || config.client_id,
      client_secret || config.client_secret,
      Spreadsheet.getRedirectUrl(redirect_url, port)
    );
    this.queue = {};

    // initialize
    this.defineTitle()
      .defineFirstData()
      .defineValidation();
    if (this.token) {
      this.authorize();
    }
  }

  /**
   * define title information
   * @param {number} [line=1]
   * @param {Object} [opts={}]
   * @param {boolean} [opts.vartical=false] TODO
   * @param {boolean} [opts.vartical=sort]
   * @returns {Spreadsheet}
   */
  defineTitle(line = 1, { vartical = false, sort = false } = {}) {
    this.Sheet.defineTitle(line, vartical, sort);
    return this;
  }

  /**
   * defile validation line
   * @param {number} [line=2]
   * @returns {Spreadsheet}
   */
  defineValidation(line = 2) {
    this.Sheet.defineValidation(line);
    return this;
  }

  /**
   * define first data
   * @param {number} [firstData=1]
   * @returns {Spreadsheet}
   */
  defineFirstData(firstData = 3) {
    this.Sheet.defineFirstData(firstData);
    return this;
  }

  /**
   * @param {string} [token]
   * @param {Object} [opts] - it is for generateAuthUrl
   * @param {Object} [opts.access_type='offline']
   * @param {Object} [opts.scope=this.scope]
   * @returns {string} token
   */
  async authorize(token = this.token, opts = {}) {
    token = token || (await this.generateToken(opts));
    token = _.isString(token) ? JSON.parse(token) : token;
    this.token = token;
    this.auth.setCredentials(token);
    return JSON.stringify(token);
  }

  /**
   * @private
   * @param {Object} [opts]
   * @param {Object} [opts.access_type='offline']
   * @param {Object} [opts.scope=this.scope]
   */
  async generateToken(opts = {}) {
    const authUrl = this.auth.generateAuthUrl({
      access_type: opts.access_type || 'offline',
      scope: opts.scope || this.scope
    });
    Logger.info(
      'getToken',
      `Authorize this app by visiting this url: ${authUrl}`
    );
    open(authUrl);
    return new Aigle(resolve => {
      const server = http
        .createServer(async (req, res) => {
          const { query: { code } } = url.parse(req.url, true);
          if (!code) {
            return res.end('Code is not found');
          }
          res.end(`Success. Your code is ${code}. Close the tab.`);
          const token = await this.auth.getTokenAsync(code);
          resolve(token);
          server.close();
        })
        .listen(this.port);
    });
  }

  /**
   * @Private
   */
  pushQueue(name, ...args) {
    const queue = (this.queue[name] = this.queue[name] || []);
    return new Aigle((resolve, reject) =>
      queue.push({ args, resolve, reject })
    );
  }

  /**
   *
   */
  releaseQueue(name) {
    _.chain(this.queue)
      .get(name)
      .forEach(({ args, resolve, reject }) =>
        this[name](args).then(resolve, reject)
      )
      .value();
  }

  /**
   * return all sheets information
   * @param {Object} [opts] - the option is for `sheets.spreadsheets.get`
   * @returns {Object}
   */
  async getSheetInfo(opts) {
    if (opts) {
      this.sheetInfo = await sheets.spreadsheets.getAsync(
        Object.assign(
          {
            auth: this.auth,
            spreadsheetId: this.spreadsheetId
          },
          opts
        )
      );
      return this.sheetInfo;
    }
    const name = 'getSheetInfo';
    if (this.sheetInfo === PROCESSING) {
      return this.pushQueue(name);
    }
    if (this.sheetInfo) {
      return this.sheetInfo;
    }
    this.sheetInfo = PROCESSING;
    this.sheetInfo = await sheets.spreadsheets.getAsync({
      auth: this.auth,
      spreadsheetId: this.spreadsheetId
    });
    this.releaseQueue(name);
    return this.sheetInfo;
  }

  async getRange(sheetName, start = 'A1', end) {
    if (end) {
      return `${sheetName}!${start}:${end}`;
    }
    const sheetInfo = await this.getSheetInfo();
    const info = _.find(
      sheetInfo.sheets,
      info => info.properties.title === sheetName
    );
    if (!info) {
      throw new Error(`SheetName not found. name: ${sheetName}`);
    }
    const { rowCount, columnCount } = info.properties.gridProperties;
    return `${sheetName}!${start}:${convertNumberToSheetTitle(
      columnCount
    )}${rowCount}`;
  }

  /**
   * @param {string} sheetName
   * @param {Object} [opts]
   * @param {Function} [opts.filter] - will be exeucte first.
   * @param {Function} [opts.validator] - will be executed after filter
   * @param {Function} [opts.formatter] - will be execute after validator
   * @param {string} [opts.range] - it will resolve automatically. ex) 'A1:W100'
   * @param {boolean} [opts.object=true]
   * @returns {Object} if json is true, return json, otherwise a sheet instance.
   */
  async getSheet(
    sheetName,
    { filter, validator, formatter, range, object = true } = {}
  ) {
    range = range || (await this.getRange(sheetName));
    const sheetInfo = await sheets.spreadsheets.values.getAsync({
      auth: this.auth,
      spreadsheetId: this.spreadsheetId,
      range
    });
    Logger.debug('getSheet', 'sheetInfo:', sheetInfo);
    const sheet = new this.Sheet(sheetName, sheetInfo, {
      filter,
      validator,
      formatter
    });
    return !object ? sheet : sheet.toObject();
  }

  /**
   * @param {string[]} [names] - default is all
   * @param {Object} [opts]
   * @param {function} [opts.filter]
   * @param {function} [opts.validator]
   * @param {function} [opts.formatter]
   * @param {function[]} [opts.filters]
   * @param {function[]} [opts.validators]
   * @param {function[]} [opts.formatters]
   * @param {string[]} [opts.ranges]
   * @param {boolean} [opts.object=true]
   * @returns {Object}
   */
  async getSheetMap(
    names,
    {
      filter,
      validator,
      formatter,
      filters = [],
      validators = [],
      formatters = [],
      ranges,
      object = true
    } = {}
  ) {
    const sheetInfo = await this.getSheetInfo();
    const nameMap = _.transform(
      sheetInfo.sheets,
      (map, { properties }) => (map[properties.title] = properties),
      {}
    );
    if (names) {
      _.forEach(names, name => {
        if (!nameMap[name]) {
          throw new Error(`Name not found. name: ${name}`);
        }
      });
    } else {
      names = _.keys(nameMap);
    }
    ranges = ranges || (await Aigle.map(names, name => this.getRange(name)));
    const { valueRanges } = await sheets.spreadsheets.values.batchGetAsync({
      auth: this.auth,
      spreadsheetId: this.spreadsheetId,
      ranges
    });
    return _.transform(
      valueRanges,
      (map, info, i) => {
        const name = names[i];
        const opts = {
          filter: filters[i] || filter,
          validator: validators[i] || validator,
          formatter: formatters[i] || formatter
        };
        const sheet = new this.Sheet(name, info, opts);
        map[name] = !object ? sheet : sheet.toObject();
      },
      {}
    );
  }
}

module.exports = Spreadsheet;
