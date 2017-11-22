# spreadsheet2json

Converts spreadsheet to JSON with validation, it is easy and fast.
You just need to specify `client_id`, `client_secret` and `spreadsheet_id`.

## Usage

```sh
$ npm i spreadsheet2json
```

First, you need to create a Spreadsheet on Google Drive.
You can define several format, this is one of examples.

|ID|Name|Type|Order|
|---|---|---|---|
|int|string|string|int|
|1|test1|test_type_1|1|
|2|test2|test_type_1|2|
|3|test3|test_type_1|3|
|4|test4|test_type_2|4|

The code is as below.

```js
const Spreadsheet = require('spreadsheet2json');

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

## APIs

### Spreadsheet.configure({ client_id, client_secret, [scope], [redirect_url], [port], [token] })


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

### Spreadsheet({ spreadsheet_id })

Create a Spreadsheet instance with spreadsheet_id, you could speficy configulation as well.

### async Spreadsheet#getSheet(sheetName, [validator], [formatter], [range], [object=true])

Get a sheet by specified name. The range will be resolved automatically, it doesn't need to be specified. \n
If auto validation or default formatter is not enough, you can define them. \n
If object is false, it will return a Sheet instance. You need to use 2D information, you need to call `Sheet#getMatrix`.

### async Spreadsheet#getSheetMap([sheetNames], [validators], [formatters], [ranges], [object=true])

Get sheets by specified names. If sheetNames is not defined, it will return all sheets.

### async Spreadsheet#getInfo()

Return spreadsheet information.
