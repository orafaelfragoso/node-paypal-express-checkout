var express = require('express'),
    app = express(),
    paypal = require('paypal-express-checkout'),
    crypto = require('crypto'),
    morgan = require('morgan'),
    fs = require('fs'),
    FileStreamRotator = require('file-stream-rotator');

// EXPRESS CONFIGURATION 

app.set('view engine', 'ejs'); 
app.set('views', './views');

// ensure log directory exists
var logDirectory = __dirname + '/log';

fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
  filename: logDirectory + '/access-%DATE%.log',
  frequency: 'daily',
  verbose: false
});

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));

var paypalConfig = {
  pas: 'J455UGEMHCJ4T6R5',
  sign: 'AFcWxV21C7fd0v3bYYYRCpSSRl31AeXoLL6RQiRSO6H1BPY4wOPqZyIt',
  success: 'http://localhost:3000/success',
  error: 'http://localhost:3000/cancel',
  debug: true // true for sandbox mode or false for production
};

var client = paypal.init(paypalConfig.user, paypalConfig.pass, paypalConfig.sign, paypalConfig.success, paypalConfig.error, paypalConfig.debug);

// SANDBOX CREDENTIALS
// USER=sdk-three_api1.sdk.com
// PWD=QFZCWN5HZM8VBG7Q
// SIGNATURE=A-IzJhZZjhg29XQ2qnhapuwxIDzyAZQ92FRP5dqBzVesOkzbdUONzmOU

// CONFIGURE ROUTES

app.get('/', function(req, res) {
  // render view with the button
  var transactionError = ((req.query.transactionError) ? true : false);

  res.render('index', {error: transactionError});
});

app.post('/send_payment', function(req, res) {
  var invoiceNumber = crypto.createHash('sha1');

  // Generate unique invoice
  invoiceNumber.update(String(Date.now()));

  client.pay(invoiceNumber, 300.00, 'Curso JavaScript Funcional', 'BRL', function(err, url) {
    if (err) {
      console.log(err);
      return;
    }

    res.redirect(url);
  });
});

app.get('/success', function(req, res) {
  var token = req.query.token,
      payerID = req.query.PayerID;

  client.detail(token, payerID, function(err, data, invoiceNumber, price) {
    if (err) {
      console.log(err);
      return;
    }

    if ( data.ACK === 'Success') {
      res.render('success', {transaction: data.TRANSACTIONID, amount: data.AMT});
    } else {
      res.redirect('/?transactionError=true');
    }
  });
});

app.get('/cancel', function(req, res) {
  res.render('cancel');
});


// CREATE SERVER
var server = app.listen(3000, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});
