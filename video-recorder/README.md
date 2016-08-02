Video-recorder
==============================

##### Video-recorder is the _Capture_ component for the Replay project.
In general word it's just a record tool for video/metadata broadcast streaming.
_"Just catch stream and save it" :smirk:_


Setup
------------------------------

#### 1. [FFmpeg](https://ffmpeg.org/)
This module uses the [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) and that requires FFmpeg to be installed on your computer.
For more information (and installation instructions) please refer to [fluent-ffmpeg prerequisites](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#prerequisites)

#### 2. [MongoDB](https://www.mongodb.com/)
First install MongoDB according to this ([installation tutorial](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)).
After installation, add some initial mock values for streaming sources by initializing the mongo db:
``` bash
db.streamingsources.save({"sourceID":100, "sourceName":"VideoMuxedStream", "sourceType":"VideoMuxedTelemetry", "sourceIP":"238.0.0.1", "sourcePort": 1234,
"streamingMethod":{"standard": "VideoStandard","version":"1.0"}, "streamingStatus":"NONE"})
db.streamingsources.save({"sourceID":101, "sourceName":"TelemetryStream", "sourceType":"Telemetry", "sourceIP":"238.0.0.1", "sourcePort": 1235,
"streamingMethod":{"standard": "VideoStandard","version":"0.9"}, "streamingStatus":"NONE"})
db.streamingsources.save({"sourceID":102, "sourceName":"VideoStream", "sourceType":"Video", "sourceIP":"238.0.0.1", "sourcePort": 1236,
"streamingMethod":{"standard": "VideoStandard","version":"0.9"}, "streamingStatus":"NONE"})
```

#### 3. [tstools](https://github.com/kynesim/tstools)
For streaming simualte you also need to install tsTools simply by:
``` bash
sudo apt-get install tstools
```

And then, for running use the command:
``` bash
tsplay Path/To/Your/TS/File.ts [IP:Port] -loop
```

#### 4. Don't forget to install package dependencies by running
```Bash
npm install
```


Running
------------------------------

#### Environment variables:
Just initialize the environment variables and run `node index.js`.
The environment variables available for configuration are:
```Bash
INDEX
STORAGE_PATH
MONGO_HOST
MONGO_PORT
MONGO_DATABASE
```

#### Run command example:
``` Bash
INDEX=102 STORAGE_PATH=/home/$USER/vod_storge_data MONGO_HOST=localhost MONGO_PORT=27017 MONGO_DATABASE=replay_dev node index.js
```


Tests
------------------------------

### Run Tests
To run the tests please ensure to be in the root directory of replay-infra and **not inside the video-recorder,** and then simply run the `npm test` command.
(If there are any problems please follow the npm instructions).


### Run Code coverege
For seeing the test code coverege you first need to install istanbul globally by using
``` bash
npm install istanbul -g
```

And then use the command
``` bash
npm run coverage`
```

The code coverege will open in a new window in your default browser.


______________________________

#### For any more info please refer to the [Wiki](https://github.com/linnovate/replay-infra/wiki).
