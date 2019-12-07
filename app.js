const express = require('express');
const limiters = require('./limiters');
const routes = require('./routes');
const app = express();

limiters.apply(app);
app.use('/', routes);

app.listen(3000, () => console.log('Server listening on port 3000!'));