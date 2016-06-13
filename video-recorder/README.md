## Installation
Simply install dependencies from npm:
```
npm install
```

## Example how to simualte streaming:
(tsplay use tstools, so if needed use 'sudo apt-get install tstools')
```
tsplay Sample.ts 238.0.0.1:1236 -loop
```

## Run Capture:
Initialize the environment variables and run, e.g:
```
INDEX=102 STORAGE_PATH=/home/$USER/vod_storge_data MONGO_HOST=localhost MONGO_PORT=27017 MONGO_DATABASE=replay_dev node index.js
```



## Mock values
Initialize mongo with:
```

db.streamingsources.save({"SourceID":100, "SourceName":"VideoMuxedStream", "SourceType":"VideoMuxedTelemetry", "SourceIP":"238.0.0.1", "SourcePort": 1234, "StreamingMethod":{"standard": "viewStandard","version":"1.0"}, "StreamingStatus":{"status":"none", "update_at":""}})

db.streamingsources.save({"SourceID":101, "SourceName":"TelemetryStream", "SourceType":"Telemetry", "SourceIP":"238.0.0.1", "SourcePort": 1235, "StreamingMethod":{"standard": "viewStandard","version":"0.9"}, "StreamingStatus":{"status":"none", "update_at":""}})

db.streamingsources.save({"SourceID":102, "SourceName":"VideoStream", "SourceType":"Video", "SourceIP":"238.0.0.1", "SourcePort": 1236, "StreamingMethod":{"standard": "viewStandard","version":"0.9"}, "StreamingStatus":{"status":"none", "update_at":""}})
```
