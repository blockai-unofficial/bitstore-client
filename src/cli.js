#!/usr/bin/env node

var debug = require('debug')('bitstore:cli');
var nconf = require('nconf');
var bitstoreClient = require('./index');

function exit(text) {
  if (text instanceof Error) {
    console.error(text.stack);
    if (text.response) {
      if (text.response.body) console.error(text.response.body);
      else console.error(text.text);
    }
  } else {
    console.error(text);
  }
  process.exit(1);
};

function initConfig() {
  var config = nconf
    .env('_')
    .defaults({
      bitstore: {
        network: 'livenet',
      },
    })
    .get('bitstore');

  var defaultHosts = {
    livenet: 'https://bitstore.blockai.com',
    testnet: 'https://bitstore-test.blockai.com',
  };

  if (!config.host) {
    config.host = defaultHosts[config.network];
  }

  if (!config.privateKey) {
    exit('`bitstore_privateKey` environment variable not set.');
  }

  return config;
};

var config = initConfig();

// TODO: refactor with commander package
function usage () {
  console.error('Usage: bitstore_privateKey=somekey bitstore_network=testnet bitstore action');
  console.error('');
  console.error('Actions:');
  console.error('');
  console.error('put <path> Upload a file');
  console.error('');
  console.error('Example:');
  console.error('');
  console.error('bitstore_privateKey=KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS bitstore put ./README.md');
  process.exit(1);
}

if (!config.privateKey) {
  usage();
}

if (process.argv.length < 3) {
  usage();
}
var action = process.argv[2];
var filepath = process.argv[3];

var host = config.host;
var privateKey = config.privateKey;

var client = bitstoreClient({
  privateKey: privateKey,
  endpoint: host,
  network: config.network
});

function error(err) {
  console.error(err);
  process.exit(1);
}

var actions = {
  put: function () {
    if (process.argv.length < 4) usage();
    client.files.put(filepath, function (err, res) {
      if (err) {
        if (err.response && err.response.error) {
          error(err.response.error);
        }
        else {
          error(err);
        }
        return;
      }
      console.log(res);
      console.log(res.status);
      console.log(res.body);
    });
  },
  list: function () {
    client.files.index(function (err, res) {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  deposit: function () {
    client.wallet.deposit(function (err, res) {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  withdraw: function () {
    var amount = process.argv[3];
    var address = process.argv[4];

    client.wallet.withdraw(amount, address, function (err, res) {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  wallet: function () {
    client.wallet.get(function (err, res) {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  transactions: function () {
    client.transactions.index(function (err, res) {
      if (err) return error(err);
      console.log(res.body);
    });
  }
};

if (!actions[action]) {
  console.log(process.argv);
  usage();
}

actions[action]();

