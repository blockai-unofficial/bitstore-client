#!/usr/bin/env node

/* eslint-disable no-console */

// import initDebug from 'debug';
import nconf from 'nconf';
import bitstoreClient from './index';

// const debug = initDebug('bitstore:cli');

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
}

function initConfig() {
  const config = nconf
    .env('_')
    .defaults({
      bitstore: {
        network: 'livenet',
      },
    })
    .get('bitstore');

  const defaultHosts = {
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
}

const config = initConfig();

// TODO: refactor with commander package
function usage() {
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
const action = process.argv[2];
const filepath = process.argv[3];

const host = config.host;
const privateKey = config.privateKey;

const client = bitstoreClient({
  privateKey: privateKey,
  endpoint: host,
  network: config.network,
});

function error(err) {
  console.error(err);
  process.exit(1);
}

const actions = {
  put: () => {
    if (process.argv.length < 4) usage();
    client.files.put(filepath, (err, res) => {
      if (err) {
        if (err.response && err.response.error) {
          error(err.response.error);
        } else {
          error(err);
        }
        return;
      }
      console.log(res);
      console.log(res.status);
      console.log(res.body);
    });
  },
  list: () => {
    client.files.index((err, res) => {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  deposit: () => {
    client.wallet.deposit((err, res) => {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  withdraw: () => {
    const amount = process.argv[3];
    const address = process.argv[4];

    client.wallet.withdraw(amount, address, (err, res) => {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  wallet: () => {
    client.wallet.get((err, res) => {
      if (err) return error(err);
      console.log(res.body);
    });
  },
  transactions: () => {
    client.transactions.index((err, res) => {
      if (err) return error(err);
      console.log(res.body);
    });
  },
};

if (!actions[action]) {
  error('Unknown command');
}

actions[action]();

