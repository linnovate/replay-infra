## Installation
Simply install dependencies from npm:
```
npm install
```

## Run
Initialize the environment variables and run, e.g:
```
INDEX=0 STORAGE_PATH=/tmp MONGO_HOST=localhost MONGO_PORT=27017 MONGO_DATABASE=replay node index.js 
```

## Mock values
Initialize mongo with:
```
db.streamingsources.insert({"SourceId":100, "SourceType":"Video", "SourceIP":"238.0.0.1", "SourcePort":"123", "StreamingMethod":{"standard": "viewStandard","version":1.0}})
db.streamingsources.insert({"SourceId":101, "SourceType":"Video", "SourceIP":"238.0.0.1", "SourcePort":"456", "StreamingMethod":{"standard": "viewStandard","version":0.9}})
db.streamingsources.insert({"SourceId":102, "SourceType":"Telemetry", "SourceIP":"238.0.0.1", "SourcePort":"789", "StreamingMethod":{"standard": "viewStandard","version":1.0}})
```
