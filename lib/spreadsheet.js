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

Aigle.promisifyAll(google.auth.OAuth2);

const SCOPES = [
  'https://spreadsheets.google.com/feeds'
];

class Spreadsheet {

  /**
   * @param {Object} params
   * @param {string} params.client_id
   * @param {string} params.client_secret
   * @param {string} params.spreadsheet_id
   * @param {string} params.redirect_url
   * @param {number} [params.port]
   * @param {string[]} [params.scope=['https://spreadsheets.google.com/feeds']]
   */
  constructor({ client_id, client_secret, spread_sheet_id, redirect_url, port, scopes }) {
    this.spreadsheetId = spread_sheet_id;
    this.scopes = scopes || SCOPES;
    this.sheetInfo = undefined;
    this.titleInfo = undefined;
    this.defineTtile();
    const redirectUrl = !port ? redirect_url : `${redirect_url}:${port}`;
    this.auth = new google.auth.OAuth2(client_id, client_secret, redirectUrl);
  }

  /**
   * define title information
   * @param {number} [line=1]
   * @param {number} [firstData=2]
   * @param {boolean} [vartical=false] TODO
   */
  defineTitle(line = 1, firstData = 2, vartical = false) {
    this.titleInfo = {
      line,
      firstData,
      vartical
    };
  }

  /**
   * @param {string} [token]
   * @param {Object} [opts] - it is for generateAuthUrl
   * @param {Object} [opts.access_type='offline']
   * @param {Object} [opts.scope=this.scope]
   * @returns {string} token
   */
  async authorize(token, opts = {}) {
    token = token || await this.getToken(opts);
    this.auth.setCredentials(token);
    return token;
  }

  /**
   * @private
   * @param {Object} [opts]
   * @param {Object} [opts.access_type='offline']
   * @param {Object} [opts.scope=this.scope]
   */
  async getToken(opts = {}) {
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
        this.storeToken(token);
        resolve(token);
        server.close();
      }).listen(3000);
    });
  }

  /**
   * return all sheets information
   * @private
   * @returns {Object}
   */
  async getSheetsInfo() {
    // TODO it may be available to use timestamp
    this.info = this.info || await new Aigle((resolve, reject) => sheets.spreadsheets.get({
      auth: this.auth,
      spreadsheetId: this.spreadsheetId,
    }, (err, res) => err ? reject(err) : resolve(res)));
    return this.info.sheets;
  }

  /**
   * @param {string} sheetName
   * @param {string} [range] - it will resolve automatically. ex) 'A1:W100'
   * @param {Function} [formatter=_.noop] - will be executed after getting sheet, even async function will work as well.
   */
  async getSheet(sheetName, range, formatter = _.noop) {
    const sheetInfo = await new Aigle((resolve, reject) => sheets.spreadsheets.values.get({
      auth: this.auth,
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${range}`
    }, (err, res) => err ? reject(err) : resolve(res)));
    const sheet = new Sheet(sheetInfo);
  }

  /**
   * @param {Function} [formatter=_.noop] - will be executed after getting sheet, even async function will work as well.
   */
  async getAllSheets(formatter = _.noop) {
    const sheetsInfo = await this.getSheetsInfo();
    const sheet = await this.getSheet('Consumables', 'A1:AA1001');
  }
}

module.exports = Spreadsheet;
