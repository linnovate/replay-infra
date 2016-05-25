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
'''
db.videoparams.insert({"karonId":100, "receivingMethod": {"standard": "TekenHozi","version":1.0}, receivingParams: {"videoPort":15555}})
db.videoparams.insert({"karonId":102, "receivingMethod": {"standard": "TekenHozi","version":0.9}, receivingParams: {"videoPort":21111, "telemetryPort": 21112}})
'''