### transport-stream-consumer
___

Handle ts files that comes from the [video-recorder](https://github.com/linnovate/replay-infra/tree/develop/video-recorder), divide to resolutions and extract additional data if exist.

___

#### run

to run the consumer first be on the replay-infra/consumer folder

then run:

`NODE_ENV=development MONGO_DATABASE=[your-mongo-db] MONGO_HOST=[your-mongo-host] MONGO_PORT=[your-mongo-port] CAPTURE_STORAGE_PATH=[your/video/recorder/storage/path]
STORAGE_PATH=your/storage/path/for/saving/the/new/data 
node index.js TransportStreamProcessing`

example:

`NODE_ENV=development MONGO_DATABASE=replay_dev MONGO_HOST=localhost MONGO_PORT=27017 CAPTURE_STORAGE_PATH=/home/$USER/video_recorder_storage
STORAGE_PATH=/home/$USER/vod_storge_data
node index.js TransportStreamProcessing`
