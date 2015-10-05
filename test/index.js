var should = require('should');
var bitstore = require('../src/');
var bitcoin = require('bitcoinjs-lib');

describe('bitstore-client', function () {
  var client;

  it('should throw an error if no private key provided', function () {
    (function () {
      client = bitstore();
    }).should.throw(/private/i);
  });

  it('should initialize with private key', function () {
    client = bitstore({
      privateKey: 'KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS',
      network: 'testnet',
      host: process.env.bitstore_host,
    });
  });

  it('should get wallet', function (done) {
    client.wallet.get(function (err, res) {
      if (err) return done(err);
      var wallet = res.body;
      wallet.address.should.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      wallet.total_balance.should.be.a.Number;
      done();
    });
  });

  it('should initialize with signMessage function', function () {
    client = bitstore({
      network: 'testnet',
      address: 'n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU',
      signMessage: function (message) {
        var key = bitcoin.ECKey.fromWIF('KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS');
        var network = bitcoin.networks.testnet;
        return bitcoin.Message.sign(key, message, network).toString('base64');
      }
    });
  });

  it('should get wallet', function (done) {
    client.wallet.get(function (err, res) {
      if (err) return done(err);
      var wallet = res.body;
      wallet.address.should.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      wallet.total_balance.should.be.a.Number;
      done();
    });
  });

  it('should initialize with async signMessage function', function () {
    client = bitstore({
      network: 'testnet',
      address: 'n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU',
      signMessage: function (message, cb) {
        var key = bitcoin.ECKey.fromWIF('KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS');
        var network = bitcoin.networks.testnet;
        setImmediate(function () {
          cb(null, bitcoin.Message.sign(key, message, network).toString('base64'));
        });
      }
    });
  });

  it('should get wallet', function (done) {
    client.wallet.get(function (err, res) {
      if (err) return done(err);
      var wallet = res.body;
      wallet.address.should.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      wallet.total_balance.should.be.a.Number;
      done();
    });
  });

});
