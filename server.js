const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config/config.json')[env];

app.use(express.json({limit: '20mb'}));
app.use(express.urlencoded({limit: '20mb', extended: true, parameterLimit:50000}));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// for parsing application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload())

const DashServer = require('./mpegdash/dash')

// Create MPEG DASH server
const dash = new DashServer(app, config)

app.get('/', (req, res) => {
    res.redirect('/live.html');
});

// Static files
app.use(express.static(__dirname  + '/www'));

// Start server
var server = app.listen(3000, () => console.log(
	'Jan MPEG Dash Live app listening on port 3000!'));


module.exports = server
