import initDebug from 'debug';
import superagent from 'superagent';
import patchSuperagent from 'superagent-as-promised';
import path from 'path';

import bitcoin from 'bitcoinjs-lib';
// see https://github.com/bitpay/bitcore-message/issues/15
import url from 'url';
import pkg from '../package.json';

// Patch superagent to support promises
patchSuperagent(superagent);

const debug = initDebug('bitstore');

const defaultHosts = {
  livenet: 'https://bitstore.blockai.com',
  testnet: 'https://bitstore-test.blockai.com',
};

const bufParser = (res, fn) => {
  const data = []; // Binary data needs binary storage
  res.on('data', (chunk) => {
    data.push(chunk);
  });
  res.on('end', () => {
    fn(null, Buffer.concat(data));
  });
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

  options.userAgent = options.userAgent || 'bitstore-cli/v' + pkg.version;

  let network;
  if (options.network === 'testnet') {
    network = bitcoin.networks.testnet;
  }

  let signMessage = options.signMessage;
  let addressString = options.address;

  if (!options.signMessage) {
    const key = bitcoin.ECKey.fromWIF(options.privateKey);
    addressString = key.pub.getAddress(network).toString();
    const memo = {};
    signMessage = (message) => {
      if (memo[message]) return memo[message];
      const signature = bitcoin.Message.sign(key, message, network).toString('base64');
      memo[message] = signature;
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
        if (!process.browser) {
          // If not in the browser, set the User-Agent. Browsers don't allow
          // setting of User-Agent, so we must disable this when run in the
          // browser (browserify sets process.browser).
          agent.set('User-Agent', options.userAgent);
        }

        // TODO: set X-BTC-Pubkey and X-BTC-Signature
        // X-BTC-Pubkey identifies the user
        // X-BTC-Signature proves user knows privkey of pubkey
        // signature could be simply siging blokai.com or the whole
        // request...
        const errFromResponse = (res) => {
          const errInfo = res.body.error ? res.body.error : {
            message: res.status.toString(),
          };

          const err = new Error(errInfo.message);

          Object.keys(errInfo).forEach((key) => {
            err[key] = errInfo[key];
          });

          err.status = res.status;
          return err;
        };

        /*
        agent.resultBuffer = () => {
          let buf = new Buffer([]);

          return agent.then((res) => {
            return BPromise((resolve, reject) => {
              res.on('data', (data) => {
                buf = Buffer.concat([ torrentBuf, data ]);
              });

              res.on('end', () => {
                return resolve(buf);
              });
            });
          });
        };
        */

        agent.result = (optionalField) => {
          return agent.then((res) => {
            if (typeof(res.status) === 'number' && res.status >= 200 && res.status < 300) {
              if (Array.isArray(res.body) || Object.keys(res.body).length) {
                return optionalField ? res.body[optionalField] : res.body;
              }
              return res.text;
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

  // Override default address for testing auth in bitstore
  const addressPath = options.addressPath ? options.addressPath : addressString;

  return {
    req: req,
    address: addressString,
    files: {
      put: (opts, cb) => {
        if (!opts || typeof opts === 'function') {
          throw new Error('Must specify URL, file path.');
        }

        if (typeof opts === 'string' && opts.match(/^https?/)) {
          // URL
          return req.post('/' + addressPath)
            .type('form')
            .send({ remoteURL: opts })
            .result()
            .nodeify(cb);
        }
        const request = req.put('/' + addressPath);
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
        return req.del('/' + addressPath + '/sha1/' + sha1)
          .result()
          .nodeify(cb);
      },
      meta: (sha1, cb) => {
        return req.get('/' + addressPath + '/sha1/' + sha1 + '?meta')
          .result()
          .nodeify(cb);
      },
      torrent: (sha1, opts = {}, cb) => {
        let uri = '/' + addressPath + '/sha1/' + sha1 + '/torrent';
        if (opts.json) {
          uri += '.json';
          return req.get(uri).result().nodeify(cb);
        }
        return req.get(uri)
          .buffer()
          .parse(bufParser)
          .result()
          .nodeify(cb);
      },
      index: (cb) => {
        return req.get('/' + addressPath)
          .result()
          .nodeify(cb);
      },
      get: (sha1, cb) => {
        return req.get('/' + addressPath + '/sha1/' + sha1)
          // .buffer(true)
          .result()
          .nodeify(cb);
      },
      thumb: (sha1, cb) => {
        return req.get('/' + addressPath + '/sha1/' + sha1 + '/thumb')
          .buffer()
          .parse(bufParser)
          .result()
          .nodeify(cb);
      },
      uriPreview: (sha1) => {
        return options.host + '/' + addressPath + '/sha1/' + sha1;
      },
    },
    batch: (uris, cb) => {
      const payload = {};
      uris.forEach((_uri) => {
        let uri = _uri;
        if (!uri.match(/^https?:/)) {
          uri = options.host + path.join('/', uri);
        }
        payload[url.parse(uri).path] = {
          uri,
          method: 'GET',
        };
      });
      return req.post('/batch')
        .send(payload)
        .result()
        .then((results) => {
          return results;
        })
        .nodeify(cb);
    },
    status: (cb) => {
      return req.get('/status')
        .result()
        .nodeify(cb);
    },
    wallet: {
      get: (cb) => {
        return req.get('/' + addressPath + '/wallet')
          .result()
          .nodeify(cb);
      },
      deposit: (cb) => {
        return req.get('/' + addressPath + '/wallet')
          .result('deposit_address')
          .nodeify(cb);
      },
      withdraw: (amount, address, cb) => {
        return req.post('/' + addressPath + '/wallet/transactions')
          .send({ type: 'withdraw', address: address, amount: amount })
          .result()
          .nodeify(cb);
      },
    },
    transactions: {
      index: (cb) => {
        return req.get('/' + addressPath + '/wallet/transactions')
          .result()
          .nodeify(cb);
      },
    },
  };
};
