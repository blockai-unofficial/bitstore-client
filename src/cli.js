#!/usr/bin/env node
/* eslint-disable no-console */

import commander from 'commander';
import cliPkg from '../package.json';
import chalk from 'chalk';
import nconf from 'nconf';
import path from 'path';
import bitstoreClient from './';
import { inspect } from 'util';

const exit = (text) => {
  if (text instanceof Error) {
    console.error(chalk.red(text.stack));
    if (text.response) {
      if (text.response.body) console.error(text.response.body);
      else console.error(text.text);
    }
  } else {
    console.error(chalk.red(text));
  }
  process.exit(1);
};

const success = (text) => {
  if (text.body) {
    console.log(chalk.green(inspect(text.body)));
  } else {
    console.log(text);
  }
  process.exit(0);
};

const initConfig = () => {
  const config = nconf
    .file(path.join(process.env.HOME, '.bitstore'))
    .defaults({
      network: 'livenet',
    })
    .get();

  const defaultHosts = {
    livenet: 'https://bitstore.blockai.com',
    testnet: 'https://bitstore-test.blockai.com',
  };

  if (!config.host) {
    config.host = defaultHosts[config.network];
  }

  if (!config.privateKey) {
    exit(`Configure { privateKey: "" } in ${process.env.HOME}/.bitstore`);
  }

  return config;
};

const initClient = (_config) => {
  const config = _config || initConfig();
  return bitstoreClient({
    privateKey: config.privateKey,
    endpoint: config.host,
    network: config.network,
  });
};

commander
  .version('bitstore version: ' + cliPkg.version + '\n');

commander
  .command('files')
  .description('list uploaded files')
  .action(() => {
    const client = initClient();
    client.files.index().then(success).catch(exit);
  });

commander
  .command('files:put <filePath>')
  .alias('upload')
  .description('upload local file or url')
  .action((filePath) => {
    const client = initClient();
    client.files.put(filePath).then(success).catch(exit);
  });

commander
  .command('files:meta <sha1>')
  .description('file metadata')
  .action((sha1) => {
    const client = initClient();
    client.files.meta(sha1).then(success).catch(exit);
  });

commander
  .command('files:torrent <sha1>')
  .description('torrent json')
  .action((sha1) => {
    const client = initClient();
    client.files.torrent(sha1, { json: true }).then(success).catch(exit);
  });

commander
  .command('files:destroy <sha1>')
  .alias('rm')
  .description('destroy file')
  .action((sha1) => {
    const client = initClient();
    client.files.destroy(sha1).then(success).catch(exit);
  });

commander
  .command('wallet')
  .description('show wallet')
  .action(() => {
    const client = initClient();
    client.wallet.get().then(success).catch(exit);
  });

commander
  .command('wallet:deposit')
  .description('deposit to wallet')
  .action(() => {
    const client = initClient();
    client.wallet.deposit().then(success).catch(exit);
  });

commander
  .command('wallet:withdraw <amount> <address>')
  .description('withdraw from wallet')
  .action((amount, address) => {
    const client = initClient();
    client.wallet.withdraw(amount, address).then(success).catch(exit);
  });

commander
  .command('transactions')
  .description('list transactions')
  .action(() => {
    const client = initClient();
    client.transactions.index().then(success).catch(exit);
  });

commander
  .command('status')
  .description('bitstore server status')
  .action(() => {
    const client = initClient();
    client.status().then(success).catch(exit);
  });

commander.parse(process.argv);
