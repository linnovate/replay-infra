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
Make sure to have MongoDB and Elasticsearch installed locally, else you may configure them via the environment variables .

Run app (default parameters will be used):
```
MONGO_DATABASE=replay_dev STORAGE_PATH=/tmp node index.js MetadataParser
```

Command line arguments to config the app:
```
<JobType> // e.g. MetadataParser
```

Environment variables to config the app:
```
STORAGE_PATH // mandatory
MONGO_HOST
MONGO_PORT
MONGO_DATABASE // mandatory
ELASTIC_HOST
ELASTIC_PORT
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
```

## Job types
Job types are found under the /job-types folder.

Job should contain the following fields:

| Property      | type          |      Example     |
|:------------- |:--------------|:-----------------|
| params        | json          | someJson         |

```
someJson example:
{
	videoId: someVideoId
	relativePath: '/relative/path/to/metadata',
	method: {
		standard: 'VideoStandard',
		version: 1.0
	}
}
```

The consumer service is given a command line argument to decide which job it should handle.

With this job type, it can find out the service which handles this job and also the queue to listen to even get those jobs.