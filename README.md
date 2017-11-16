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
  clientId: '<client id>',
  clientSecret: '<client secret>',
  scope: ['https://spreadsheets.google.com/feeds'],
  redirectUrl: '<reidrect url>',
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

## APIs

### Spreadsheet.configure(config)

### Spreadsheet.defineTitle([line=1], [vartical=false], [sort=false])

The defined line will be used for object keys. (vartical is not supported yet.)
If sort is true, the key will be sorted by JavaScript comparision.

### Spreadsheet.defineValidation([line=2])

The defined line will be used for validation. The validation types are as below. If it is not included, you can define own validations. See Speadsheet#getSheet

|types|description|
|---|---|
|int/integer||
|number/float/double||
|string||
|boolean||

### Spreadsheet.defineFirstData([line=3])

The defined line will be first data line.

### Spreadsheet({ spreadsheetId })

### async Spreadsheet#getSheet(sheetName, [validator], [formatter], [range], [object=true])

### async Spreadsheet#getSheetMap([sheetNames], [validator or validators], [formatter or formatters], [ranges], [object=true])

### async Spreadsheet#getInfo()
