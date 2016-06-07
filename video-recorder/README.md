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
db.streamingsources.insert({"SourceID":100, "SourceName":"239", "SourceType":"Video", "SourceIP":"238.0.0.1", "SourcePort":"123", "StreamingMethod":{"standard": "viewStandard","version":1.0}, "StreamingStatus":{"status":"none", "update_at":""}})
db.streamingsources.insert({"SourceID":101, "SourceType":"Video", "SourceIP":"238.0.0.1", "SourcePort":"456", "StreamingMethod":{"standard": "viewStandard","version":0.9}})
db.streamingsources.insert({"SourceID":102, "SourceType":"Telemetry", "SourceIP":"238.0.0.1", "SourcePort":"789", "StreamingMethod":{"standard": "viewStandard","version":1.0}})

SourceID: {type: Number,
        required: true,
        unique: true
    },
    SourceName: {
        type: String,
        required: true
    },
    SourceType: {
        type: String,
        required: true
    },
    SourceIP: {
        type: String,
        required: true
    },
    SourcePort: {
        type: Number,
        required: true
    },
    StreamingMethod: {
        standard: {
            type: String,
            required: true
        },
        version: {
            type: Number,
            required: true
        }
    },
    StreamingStatus: {
        status: {
            type: String,
            required: true,
            default:'STOP'
        },
        updated_at: {
            type: Date,
            default: Date.now()
        }
    }
```
