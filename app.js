const express = require('express');
var expressWs = require('express-ws');
const limiters = require('./limiters');
const routes = require('./routes');
const app = express();
expressWs(app);



limiters.apply(app);
app.use('/', routes);

let port = process.env.PORT || 3000;
let welcome = `Server listening on port ${port}`;
app.listen(port, () => console.log(welcome));