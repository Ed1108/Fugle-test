const express = require('express');
var expressWs = require('express-ws');
const limiters = require('./limiters');
const routes = require('./routes');
const app = express();
expressWs(app);



limiters.apply(app);
app.use('/', routes);

app.listen(3000, () => console.log('Server listening on port 3000!'));