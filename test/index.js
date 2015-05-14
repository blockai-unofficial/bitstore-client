var should = require('should');
var bitstore = require('../src/');

describe('bitstore-client', function () {
  var client;

  it('should throw an error if no private key provided', function () {
    (function () {
      client = bitstore();
    }).should.throw(/private/i);
  });

  it('should initialize', function () {
    client = bitstore({
      privateKey: 'KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS',
      network: 'testnet'
    });
  });

  it('should get wallet', function (done) {
    client.wallet.get(function (err, res) {
      if (err) return done(err);
      var wallet = res.body;
      wallet.address.should.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      wallet.balance.should.equal(0);
      done();
    });
  });
});
