## Description

The purpose of this module is to hold and share all the Mongoose schemas across the app.

## Usage

Make sure to connect database by calling connectMongo before using the schemas:
```
var connectMongo = require('replay-schemas/connectMongo');

connectMongo()
.then(...);
```

Access to the models is achieved via:
```
var ModelName = require('replay-schemas/ModelName');
```
