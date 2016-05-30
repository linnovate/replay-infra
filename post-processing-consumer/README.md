## Installation
First install redis:
```
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
sudo make install

```

## Running
Run redis:
```
redis-server
```
Run app (default parameters will be used):
```
STORAGE_PATH=/tmp QUEUE_NAME=DEFAULT_TASKS_QUEUE node index.js
```
Job types are found under the /job-types folder.
Environment variables to config the app:
QUEUE_NAME // mandatory
JOB_TYPE
STORAGE_PATH
MONGO_HOST
MONGO_PORT
MONGO_DATABASE
ELASTIC_HOST
ELASTIC_PORT
ELASTIC_INDEX
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD


## Job types
Job should be constructed in the following way:
| Property      | type          |      Example     |       |
| ------------- |:-------------:|-----------------:|
| type          | string        | 'MetadataParser' |
| params        | json          | someJson         |
```
someJson:
{
	videoId: someVideoId
	relativePath: '/relative/path/to/metadata',
	method: {
		standard: 'TekenHozi',
		version: 1.0
	}
}
```

The consumer service can work in several modes.
* If called without any JOB_TYPE env parameter, the service will be able to handle all jobs.
Once it grabs a job from the queue, it will perform it accordingly.

* If called with a specific JOB_TYPE env parameter, the service will only handle this type of job.
JOB_TYPE value can be found in the /job-types package.
