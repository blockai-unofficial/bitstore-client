import initDebug from 'debug';
import superagent from 'superagent';
import patchSuperagent from 'superagent-as-promised';

import bitcoin from 'bitcoinjs-lib';
// see https://github.com/bitpay/bitcore-message/issues/15
import url from 'url';

// Patch superagent to support promises
patchSuperagent(superagent);

const debug = initDebug('bitstore');

const defaultHosts = {
  livenet: 'https://bitstore.blockai.com',
  testnet: 'https://bitstore-test.blockai.com',
};

export default (options) => {
  if (!options.privateKey && (!options.signMessage || !options.address)) {
    throw new Error('Must initialize client with private key or signMessage function and address.');
  }

  if (!options.network) {
    options.network = 'livenet';
  }

  if (!options.host) {
    options.host = defaultHosts[options.network];
  }

  let network;
  if (options.network === 'testnet') {
    network = bitcoin.networks.testnet;
  }

  let signMessage = options.signMessage;
  let addressString = options.address;

  if (!options.signMessage) {
    const key = bitcoin.ECKey.fromWIF(options.privateKey);
    addressString = key.pub.getAddress(network).toString();
    signMessage = (message) => {
      const signature = bitcoin.Message.sign(key, message, network).toString('base64');
      return signature;
    };
  }

  // const addressString = privKey.toPublicKey().toAddress().toString();

  /**
   * Wrapper around superagent that automatically builds URLs
   * and adds authentication option.
   *
   */
  const req = () => {
    const reqObj = {};
    ['get', 'post', 'put', 'del'].forEach((method) => {
      reqObj[method] = (resource) => {
        const agent = superagent[method](options.host + resource);
        // TODO: set this as .auth() method on agent object

        // TODO: set X-BTC-Pubkey and X-BTC-Signature
        // X-BTC-Pubkey identifies the user
        // X-BTC-Signature proves user knows privkey of pubkey
        // signature could be simply siging blokai.com or the whole
        // request...
        const errFromResponse = (res) => {
          const err = new Error(res.body.error ? res.body.error : res.status.toString());
          err.status = res.status;
          return err;
        };

        agent.result = (optionalField) => {
          return agent.then((res) => {
            if (typeof(res.status) === 'number' && res.status >= 200 && res.status < 300) {
              return optionalField ? res.body[optionalField] : res.body;
            }
            throw errFromResponse(res);
          })
          .catch((err) => {
            if (err.response) {
              throw errFromResponse(err.response);
            }
            throw err;
          });
        };

        /**
         * We need to mofify agent's end() function to be able
         * to do an async call before callind end.
         */
        agent._end = agent.end;
        agent.end = (fn) => {
          const message = url.parse(options.host).host;
          // Sign host with private key

          // Async
          if (signMessage.length === 2) {
            signMessage(message, (err, signature) => {
              if (err) return fn(err);
              debug('Address:', addressString);
              debug('Message:', message);
              debug('Signature:', signature);
              agent.set('X-BTC-Address', addressString);
              agent.set('X-BTC-Signature', signature);
              return agent._end(fn);
            });
          } else {
            // Sync
            const signature = signMessage(message);
            debug('Address:', addressString);
            debug('Message:', message);
            debug('Signature:', signature);
            agent.set('X-BTC-Address', addressString);
            agent.set('X-BTC-Signature', signature);
            return agent._end(fn);
          }
        };


        return agent;
      };
    });
    return reqObj;
  }();

  return {
    req: req,
    files: {
      put: (opts, cb) => {
        if (!opts || typeof opts === 'function') {
          throw new Error('Must specify URL, file path.');
        }

        if (typeof opts === 'string' && opts.match(/^https?/)) {
          // URL
          return req.post('/' + addressString)
            .type('form')
            .send({ remoteURL: opts })
            .result()
            .nodeify(cb);
        }
        const request = req.put('/' + addressString);
        // File path
        if (typeof opts === 'string') {
          request.attach('file', opts);
        } else {
          // HTML5 File object
          request.attach('file', opts);
        }
        request.on('progress', (event) => {
          if (opts.onProgress) {
            opts.onProgress(event);
          }
        });
        return request
          .result()
          .nodeify(cb);
      },
      destroy: (sha1, cb) => {
        return req.del('/' + addressString + '/sha1/' + sha1)
          .result()
          .nodeify(cb);
      },
      meta: (sha1, cb) => {
        return req.get('/' + addressString + '/sha1/' + sha1 + '?meta')
          .result()
          .nodeify(cb);
      },
      index: (cb) => {
        return req.get('/' + addressString)
          .result()
          .nodeify(cb);
      },
      get: (sha1, cb) => {
        return req.get('/' + addressString + '/sha1/' + sha1)
          // .buffer()
          .result()
          .nodeify(cb);
      },
      uriPreview: (sha1) => {
        return options.host + '/' + addressString + '/sha1/' + sha1;
      },
    },
    batch: (paths, cb) => {
      const payload = {};
      paths.forEach((path) => {
        payload[path] = {
          method: 'GET',
          uri: path,
        };
      });
      return req.post('/batch')
        .send(payload)
        .result()
        .nodeify(cb);
    },
    wallet: {
      get: (cb) => {
        return req.get('/' + addressString + '/wallet')
          .result()
          .nodeify(cb);
      },
      deposit: (cb) => {
        return req.get('/' + addressString + '/wallet')
          .end((err, res) => {
            res.body = {
              deposit_address: res.body.deposit_address,
            };
            cb(err, res);
          })
          .result()
          .nodeify(cb);
      },
      withdraw: (amount, address, cb) => {
        return req.post('/' + addressString + '/wallet/transactions')
          .send({ type: 'withdraw', address: address, amount: amount })
          .result()
          .nodeify(cb);
      },
    },
    transactions: {
      index: (cb) => {
        return req.get('/' + addressString + '/wallet/transactions')
          .result()
          .nodeify(cb);
      },
    },
  };
};
