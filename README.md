# spreadsheet2json

Converts spreadsheet to JSON with validation, easy and fast.

## Usage

```sh
$ npm i spreadsheet2json
```

```js
cosnt Spreadsheet = require('spreadsheet2json');

const tokenpath = '<token path>';

// configuration
const config = {
  client_id: '<client id>',
  client_secret: '<client secret>',
  scope: ['https://spreadsheets.google.com/feeds'],
  redirect_url: '<reidrect url>',
  port: '<port>',
  token: fs.existsSync(tokenpath) && require(tokenpath),
};
Spreadsheet.configure(config);

// define title, validation and first line of data
const spreadsheet = new Spreadsheet({ spreadsheet_id: '<spreadsheet id>' });
  .defineTitle(1)
  .defineValidation(2);
  .defineFirstData(3);

if (!config.token) {
  const token = await spreadsheet.authorize();
  fs.writeFileSync(tokenpath, JSON.stringify(token));
}

// get all sheets
const sheetMap = await spreadsheet.getSheetMap();

// get a sheet
const sheet = await spreadsheet.getSheet('<sheet name>');

// get speficied sheets
const sheetMap = await spreadsheet.getSheetMap(['sheet1', 'sheet3']);
```


