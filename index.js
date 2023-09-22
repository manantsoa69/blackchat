const express = require('express');
const compression = require('compression');
require('dotenv').config();

const webApp = express();
const PORT = process.env.PORT || 3000;

// Use the compression middleware to enable Gzip compression
webApp.use(compression());

webApp.use(express.urlencoded({ extended: true }));
webApp.use(express.json());



// Load other routes and middlewares
const fbWebhookRoute = require('./routes/fbWebhookRoute');
const homeRoute = require('./routes/homeRoute');

webApp.use('/facebook', fbWebhookRoute.router);
webApp.use('/', homeRoute.router);


// New route to handle a simple request
webApp.get('/hello', (req, res) => {
  // Log something after receiving the request

  
  res.send('Hserver!');
  console.log(' /up');
});


webApp.listen(PORT, () => {
  console.log(`Server is up and running at ${PORT}`);
});
