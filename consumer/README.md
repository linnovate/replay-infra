## Installation
Install RabbitMQ according to the instructions [in replay-rabbitmq repo](https://github.com/linnovate/replay-common/tree/develop/replay-rabbitmq).

You can have have MongoDB installed locally, else you may configure it via the environment variables.

Initialize Mongo with the default required collections via the helper module [replay-db-initialization](https://github.com/linnovate/replay-common/tree/develop/replay-db-initialization).

Set environment variables to config the app:

| Name                            | Description                                  | Default           |
|---------------------------------|----------------------------------------------|-------------------|
| MONGO_HOST                      | Mongo host URI                               | localhost         |
| MONGO_PORT                      | Mongo port                                   | 27017             |
| MONGO_DATABASE                  | Mongo database name                          | replay_dev        |
| ELASTIC_HOST                    | Elastic host URI                             | localhost         |
| ELASTIC_PORT                    | Elastic port                                 | 9200              |
| ELASTIC_VIDEO_METADATA_INDEX    | The index of the VideoMetadata in Elastic    | videometadatas    |
| ELASTIC_VIDEO_METADATA_TYPE     | The type of the VideoMetadata in Elastic     | videometadata     |
| RABBITMQ_HOST                   | RabbitMQ host URI                            | localhost         |
| RABBITMQ_MAX_RESEND_ATTEMPS     | Max attempts to resend messages              | 3                 |
| RABBITMQ_MAX_UNACKED_MESSAGES   | Max parallel messages to process without ACK |                   |
| RABBITMQ_FAILED_JOBS_QUEUE_NAME | Name of the queue for failed jobs            | FAILED_JOBS_QUEUE |
| CAPTIONS_PATH                   | Path to pass captions through                |                   |
| DESTINATION_PATH                | Path to which captions will be thrown        |                   |

Run app:
```
node index.js MetadataParser
```

## Job types
Job types are found in [in replay-jobs-service repo](https://github.com/linnovate/replay-common/tree/develop/replay-jobs-service) under the /queues-config folder.

The consumer service is given a command line argument to decide which job it should handle.

With this job type, it can find out the service which handles this job and also the queue to listen to even get those jobs.

## Tests
We use mocha as our tests framework, therefore install mocha globally:
```
sudo npm install mocha -g
```

Now simply run the tests with npm:
```
npm test
```
