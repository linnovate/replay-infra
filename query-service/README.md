# query-service

Run with:
```
sails lift
```

Environment variables:
MONGO_HOST
MONGO_PORT
MONGO_DATABASE
ELASTIC_HOST
ELASTIC_PORT

Querying examples:
```
GET /videometadata?videoId=578396a5ccb2cf576203fe35
GET /query?limit=10
GET /video?boundingShapeType=polygon&boundingShapeCoordinates=[[[35.527510, 27.105208],[35.524920, 27.106178],[35.525464, 27.109094],[35.527510, 27.105208]]]
```
