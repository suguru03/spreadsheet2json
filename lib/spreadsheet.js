'use strict';

const url = require('url');
const http = require('http');

const _ = require('lodash');
const open = require('open');
const Aigle = require('aigle');
const google = require('googleapis');
const sheets = google.sheets('v4');

const Logger = require('./logger');
const Sheet = require('./sheet');
const { convertNumberToSheetTitle } = require('./util');

Aigle.promisifyAll(google.auth.OAuth2);

const SCOPE = [
  'https://spreadsheets.google.com/feeds'
];

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
  static configure({ client_id, client_secret, redirect_url, port, token, scope }) {
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
    redirectUrl = redirectUrl || _.get(this.config, ['redirect_url'], 'http://localhost');
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
  constructor({ client_id, client_secret, spreadsheet_id, redirect_url, port, token, scope }) {
    this.spreadsheetId = spreadsheet_id;
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
   * @param {boolean} [vartical=false] TODO
   * @param {boolean} [vartical=sort]
   * @returns {Spreadsheet}
   */
  defineTitle(line = 1, vartical = false, sort = false) {
    Sheet.defineTitle(line, vartical, sort);
    return this;
  }

  /**
   * defile validation line
   * @param {number} [line=2]
   * @returns {Spreadsheet}
   */
  defineValidation(line = 2) {
    Sheet.defineValidation(line);
    return this;
  }


  /**
   * define first data
   * @param {number} [firstData=1]
   * @returns {Spreadsheet}
   */
  defineFirstData(firstData = 3) {
    Sheet.defineFirstData(firstData);
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
    token = token || await this.generateToken(opts);
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
    Logger.info('getToken', `Authorize this app by visiting this url: ${authUrl}`);
    open(authUrl);
    return new Aigle(resolve => {
      const server = http.createServer(async (req, res) => {
        const { query: { code } } = url.parse(req.url, true);
        if (!code) {
          return res.end('Code is not found');
        }
        res.end(`Success. Your code is ${code}. Close the tab.`);
        const token = await this.auth.getTokenAsync(code);
        resolve(token);
        server.close();
      }).listen(this.port);
    });
  }

  /**
   * return all sheets information
   * @returns {Object}
   */
  async getSheetInfo() {
    this.sheetInfo = this.sheetInfo || await new Aigle((resolve, reject) => sheets.spreadsheets.get({
      auth: this.auth,
      spreadsheetId: this.spreadsheetId,
    }, (err, res) => err ? reject(err) : resolve(res)));
    return this.sheetInfo;
  }

  /**
   * @param {string} sheetName
   * @param {Function} [validator] - will be executed after getting sheet, even async function will work as well. The first argument is data and the second one is type.
   * @param {Function} [formatter] - same as above
   * @param {string} [range] - it will resolve automatically. ex) 'A1:W100'
   * @param {boolean} [object=true]
   * @returns {Object} if json is true, return json, otherwise a sheet instance.
   */
  async getSheet(sheetName, validator, formatter, range, object = true) {
    if (!range) {
      const sheetInfo = await this.getSheetInfo();
      const info = _.find(sheetInfo.sheets, info => info.properties.title === sheetName);
      if (!info) {
        throw new Error(`SheetName not found. name: ${sheetName}`);
      }
      const { rowCount, columnCount } = info.properties.gridProperties;
      range = `A1:${convertNumberToSheetTitle(columnCount)}${rowCount}`;
    }
    const sheetInfo = await new Aigle((resolve, reject) => sheets.spreadsheets.values.get({
      auth: this.auth,
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${range}`
    }, (err, res) => err ? reject(err) : resolve(res)));
    Logger.debug('getSheet', 'sheetInfo:', sheetInfo);
    const sheet = new Sheet(sheetName, sheetInfo, validator, formatter);
    return !object ? sheet : sheet.toObject();
  }

  /**
   * @param {string[]} [names] - default is all
   * @param {Function[]|function} [validators] - will be executed after getting sheet, even async function will work as well.
   * @param {Function[]|function} [formatters] - same as above
   * @param {string[]} [ranges]
   * @param {boolean} [object=true]
   * @returns {Object}
   */
  async getSheetMap(names, validators = [], formatters = [], ranges = [], object = true) {
    const sheetInfo = await this.getSheetInfo();
    const nameMap = _.transform(sheetInfo.sheets, (result, { properties }) => {
      result[properties.title] = properties;
    }, {});
    if (names) {
      _.forEach(names, name => {
        if (!nameMap[name]) {
          throw new Error(`Name not found. name: ${name}`);
        }
      });
    } else {
      names = _.keys(nameMap);
    }
    let finished = 0;
    return Aigle.transform(names, async (map, name, i) => {
      const start = Date.now();
      Logger.debug('getSheetMap', `getting... ${name}`);
      const validator = _.isArray(validators) ? validators[i] : validators;
      const formatter = _.isArray(formatters) ? formatters[i] : formatters;
      map[name] = await this.getSheet(name, validator, formatter, ranges[i], object);
      Logger.debug('getSheetMap', `finished. ${name}:${Date.now() - start}ms [${++finished}/${names.length}]`);
    }, {});
  }
}

module.exports = Spreadsheet;
