# stanag

npm package to access and use the Nato Standardization Agreement based standards for node.js application

Currenlly supported standards:
 - 0601.9 [(Docs)](http://www.gwg.nga.mil/misb/docs/standards/ST0601.9.pdf)


provide a single function
```js
stanag(Buffer[, format])
```

where Buffer is a node.js Buffer array returned by fs.readFile or some other functions,
and format is one of: 'tag' (default) or 'name'.

# examples

## basic
#### input
```js
var fs = require('fs'),
    stanag = require('stanag');

fs.readFile(BINARY_FILE, function(err,data){
  if(err) throw err;

  var data = stanag(data);
  data = JSON.stringify(data,null,2))
  console.log(data)
})
```

#### output

```js
[
  {
    "key": "060e2b34020b01010e01030101000000",
    "length": 409,
    "value": {
      "1": {
        "tag": 1,
        "length": 2,
        "name": "Checksum",
        "units": "None",
        "value": "8ced",
        "formatted": "8ced"
      },
      "2": {
        "tag": 2,
        "length": 8,
        "name": "UNIX Time Stamp",
        "units": "Microseconds",
        "value": 1224807209913000,
        "formatted": "2008-10-24T00:13:29.913Z"
      },
      "3": {
        "tag": 3,
        "length": 9,
        "name": "Mission ID",
        "units": "String",
        "value": "MISSION01",
        "formatted": "MISSION01"
      },
      "4": {
        "tag": 4,
        "length": 6,
        "name": "Platform Tail Number",
        "units": "String",
        "value": "AF-101",
        "formatted": "AF-101"
      }
    }
  }
]
```


## with 'name' format:
#### output
```js
[
  {
    "key": "060e2b34020b01010e01030101000000",
    "length": 409,
    "value": {
      "checksum": {
        "tag": 1,
        "length": 2,
        "name": "Checksum",
        "units": "None",
        "value": "8ced",
        "formatted": "8ced"
      },
      "uNIXTimeStamp": {
        "tag": 2,
        "length": 8,
        "name": "UNIX Time Stamp",
        "units": "Microseconds",
        "value": 1224807209913000,
        "formatted": "2008-10-24T00:13:29.913Z"
      },
      "missionID": {
        "tag": 3,
        "length": 9,
        "name": "Mission ID",
        "units": "String",
        "value": "MISSION01",
        "formatted": "MISSION01"
      },
      "platformTailNumber": {
        "tag": 4,
        "length": 6,
        "name": "Platform Tail Number",
        "units": "String",
        "value": "AF-101",
        "formatted": "AF-101"
      }
    }
  }
]
```