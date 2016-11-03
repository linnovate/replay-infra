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

After installation, add some initial mock values for streaming sources by initializing the mongo db
with the _mongo-init_ script in [replay-db-initialization](https://github.com/linnovate/replay-common/tree/develop/replay-db-initialization) using the _streaming-source_ data-file.

For example, **inside _replay-db-initialization_** run the following command:
``` bash
MONGO_HOST=localhost MONGO_PORT=27017 MONGO_DATABASE=replay_dev REPLAY_SCHEMA=StreamingSource DATA_FILE=streaming-source npm run mongo-init
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
RABBITMQ_HOST
RABBITMQ_PORT
RABBITMQ_USERNAME
RABBITMQ_PASSWORD
```

#### Run command example:
``` Bash
INDEX=102 STORAGE_PATH=/home/$USER/vod_storge_data MONGO_HOST=localhost MONGO_PORT=27017 MONGO_DATABASE=replay_dev node index.js
```


Tests
------------------------------

### Run Tests
To run the video-recorder tests simply run the `npm test` command.  
_You can also run the tests for all replay-infra by runing the `npm test` command in the root directory of replay-infra._  
(If there are any problems/errors, please follow the npm instructions).


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
