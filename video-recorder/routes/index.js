var ActionService = require('./controllers/ActionController')

app.get('/start', ActionController.start);

app.get('/stop', ActionController.stop);