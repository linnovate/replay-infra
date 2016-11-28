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
MONGO_USERNAME
MONGO_PASSWORD
RABBITMQ_HOST
RABBITMQ_PORT
RABBITMQ_USERNAME
RABBITMQ_PASSWORD
```

#### Run command example:
``` Bash
INDEX=102 STORAGE_PATH=/home/$USER/vod_storge_data MONGO_HOST=localhost MONGO_PORT=27017 MONGO_DATABASE=replay_dev node index.js
```

Dockerizing
------------------------------

#### 1. you should have docker installed and ready to use on your machine https://docs.docker.com/engine/installation/linux/ubuntulinux/

#### 2. From the project's folder build a docker image from the docker file that's included in the repository
``` bash
docker build -t replay/video-recorder:1.0 .
```
** you might need to adjust the Dockerfile enviroment variables

#### 2.5. if you are self streaming to your capture docker make sure you have a route configured for the streaming sources
e.g
``` bash 
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
238.0.0.0       *               255.255.255.0   U     0      0        0 docker0
```
to add routing use 
e.g 
``` bash 
route add -net 238.0.0.0 netmask 255.255.255.0 docker0
```

#### 3. Run the container from the image you have just created with bash shell
``` bash
docker run -it -p <SourcePort>:<SourcePort>/udp -v </mnt/your-vod-storage/path>:<relevante/path/in/docker> replay/video-recorder:1.0 /bin/bash
```

#### 4. From the shell run the capture process
``` bash
node index.js
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
