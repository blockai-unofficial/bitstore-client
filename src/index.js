var debug = require('debug')('bitstore');
var superagent = require('superagent');
var bitcoin = require('bitcoinjs-lib');
// see https://github.com/bitpay/bitcore-message/issues/15
var url = require('url');

var bitstoreClient = function (options) {
  if (!options.privateKey && (!options.signMessage || !options.address)) {
    throw new Error('Must initialize client with private key or signMessage function and address.');
  }
  if (!options.endpoint) {
    if (options.network === 'testnet') {
      options.endpoint = 'https://bitstore-test.blockai.com';
    }
    else {
      options.endpoint = 'https://bitstore.blockai.com';
    }
  }

  var network;
  if (options.network === 'testnet') {
    network = bitcoin.networks.testnet;
  }

  var signMessage = options.signMessage;
  var addressString = options.address;

  if (!options.signMessage) {
    var key = bitcoin.ECKey.fromWIF(options.privateKey);
    addressString = key.pub.getAddress(network).toString();
    signMessage = function (message) {
      var signature = bitcoin.Message.sign(key, message, network).toString('base64');
      return signature;
    };
  }

  //var addressString = privKey.toPublicKey().toAddress().toString();

  /**
   * Wrapper around superagent that automatically builds URLs
   * and adds authentication option.
   *
   */
  var req = function () {
    var req = {};
    ['get', 'post', 'put', 'del'].forEach(function (method) {
      req[method] = function (resource, cb) {
        var agent = superagent[method](options.endpoint + resource);
        // TODO: set this as .auth() method on agent object

        // TODO: set X-BTC-Pubkey and X-BTC-Signature
        // X-BTC-Pubkey identifies the user
        // X-BTC-Signature proves user knows privkey of pubkey
        // signature could be simply siging blokai.com or the whole
        // request...

        /**
         * We need to mofify agent's end() function to be able
         * to do an async call before callind end.
         */
        agent._end = agent.end;
        agent.end = function (fn) {
          var message = url.parse(options.endpoint).host;
          // Sign host with private key

          // Async
          if (signMessage.length === 2) {
            signMessage(message, function (err, signature) {
              if (err) return fn(err);
              debug('Address:', addressString);
              debug('Message:', message);
              debug('Signature:', signature);
              agent.set('X-BTC-Address', addressString);
              agent.set('X-BTC-Signature', signature);
              return agent._end(fn);
            });
          }
          // Sync
          else {
            var signature = signMessage(message);
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
    return req;
  }();

  function wrapCb (cb) {
    return function (err, res) {
      cb(err, res);
    };
  }

  return {
    req: req,
    files: {
      put: function (opts, cb) {
        if (!opts || typeof opts === 'function') {
          throw new Error('Must specify URL, file path.');
        }

        if (typeof opts === 'string' && opts.match(/^https?/)) {
          // URL
          req.post('/' + addressString)
            .type('form')
            .send({ remoteURL: opts })
            .end(wrapCb(cb));
        }
        else {
          var r = req.put('/' + addressString);
          // File path
          if (typeof opts === 'string') {
            r.attach('file', opts);
          }
          // HTML5 File object
          else {
            r.attach('file', opts);
          }
          r.on('progress', function(e) {
            if (opts.onProgress) {
              opts.onProgress(e);
            }
          });
          r.end(wrapCb(cb));
        }
      },
      destroy: function (sha1, cb) {
        req.del('/' + addressString + '/sha1/' + sha1)
          .end(wrapCb(cb));
      },
      meta: function (sha1, cb) {
        req.get('/' + addressString + '/sha1/' + sha1 + '?meta')
          .end(wrapCb(cb));
      },
      index: function (cb) {
        req.get('/' + addressString)
          .end(wrapCb(cb));
      },
      get: function (sha1, cb) {
        req.get('/' + addressString + '/sha1/' + sha1)
          //.buffer()
          .end(wrapCb(cb));
      }
    },
    wallet: {
      get: function (cb) {
        req.get('/' + addressString + '/wallet')
          .end(wrapCb(cb));
      },
      deposit: function (cb) {
        req.get('/' + addressString + '/wallet')
          .end(function (err, res) {
            res.body = {
              deposit_address: res.body.deposit_address
            };
            cb(err, res);
          });
      },
      withdraw: function (amount, address, cb) {
        req.post('/' + addressString + '/wallet/transactions')
          .send({ type: 'withdraw' , address: address, amount: amount })
          .end(wrapCb(cb));

      }
    },
    transactions: {
      index: function (cb) {
        req.get('/' + addressString + '/wallet/transactions')
          .end(wrapCb(cb));
      }
    }
  };
};

module.exports = bitstoreClient;