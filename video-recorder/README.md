# Video-recorder
"Just catch stream and save it (;"


####Video-recorder is record tool for broadcast streaming.

___


## Setup before starting

1. First the app need the [FFmpeg](https://ffmpeg.org/), please install it on your computer.
2. second please install [MongoDB](https://www.mongodb.com/).
3. Add some Mock values by initializing in mongo:
```

db.streamingsources.save({"SourceID":100, "SourceName":"VideoMuxedStream", "SourceType":"VideoMuxedTelemetry", "SourceIP":"238.0.0.1", "SourcePort": 1234, "StreamingMethod":{"standard": "viewStandard","version":"1.0"}, "StreamingStatus":{"status":"none", "update_at":""}})

db.streamingsources.save({"SourceID":101, "SourceName":"TelemetryStream", "SourceType":"Telemetry", "SourceIP":"238.0.0.1", "SourcePort": 1235, "StreamingMethod":{"standard": "viewStandard","version":"0.9"}, "StreamingStatus":{"status":"none", "update_at":""}})

db.streamingsources.save({"SourceID":102, "SourceName":"VideoStream", "SourceType":"Video", "SourceIP":"238.0.0.1", "SourcePort": 1236, "StreamingMethod":{"standard": "viewStandard","version":"0.9"}, "StreamingStatus":{"status":"none", "update_at":""}})
```

___

## Installation
Simply install dependencies from npm:
```Bash
npm install
```
___

## Example how to simualte streaming:

install [tsTools](https://github.com/kynesim/tstools).

Then run:

```Bash
tsplay Path/To/Your/TS/File.ts [IP:Port] -loop
```

___

## Run Capture:
Initialize the environment variables and run, e.g:
```Bash
INDEX=102 STORAGE_PATH=/home/$USER/vod_storge_data MONGO_HOST=localhost MONGO_PORT=27017 MONGO_DATABASE=replay_dev node index.js
```

___

#### For More Info Please Check out [Wiki](https://github.com/linnovate/replay-infra/wiki).

