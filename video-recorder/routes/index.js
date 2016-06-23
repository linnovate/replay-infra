var ActionRouter = require('./controllers/ActionController')

app.get('/start', ActionController.start);

app.get('/stop', ActionController.stop);