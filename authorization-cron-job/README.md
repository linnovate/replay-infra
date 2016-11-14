## Description
The cron job purpose is to check the missions and update their videos according to the mission details.

## Installation

Clone the repo and install dependencies:
```
npm install
```

## Configurations
Set environment variables to config the app:

| Name              | Description                  | Default    |
|-------------------|------------------------------|------------|
| MONGO_HOST        | Mongo host URI               | localhost  |
| MONGO_PORT        | Mongo port                   | 27017      |
| MONGO_DATABASE    | Mongo database name          | replay_dev |
| MONGO_USERNAME    | Mongo user name              | replay     |
| MONGO_PASSWORD    | Mongo password               | replay     |
| SET_AUTH_INTERVAL | Cron job interval in minutes | 1          |


## Usage
Run with:
```
node set-video-authorization.js 
```

## Testing
Testing the video autorization cron job by manipulating mission documents and run the cron job in the same time to check that it handled corectly.  
The testing starts cron job process and should kill him at the end of the tests – try to avoid terminating the tests in the middle.  

Run with:
```
npm test
```
