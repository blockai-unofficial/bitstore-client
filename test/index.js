import { expect } from 'chai';
import bitstore from '../src';
import bitcoin from 'bitcoinjs-lib';

describe('bitstore-client', () => {
  let client;

  it('should throw an error if no private key provided', () => {
    expect(() => {
      client = bitstore();
    }).to.throw(/private/i);
  });

  it('should initialize with private key', () => {
    client = bitstore({
      privateKey: 'KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS',
      network: 'testnet',
      host: process.env.bitstore_host,
    });
  });

  it('should get wallet', (done) => {
    client.wallet.get((err, wallet) => {
      if (err) return done(err);
      expect(wallet.address).to.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      expect(wallet.total_balance).to.be.a('number');
      done();
    });
  });

  it('should get wallet (promise api)', () => {
    return client.wallet.get().then((wallet) => {
      expect(wallet.address).to.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      expect(wallet.total_balance).to.be.a('number');
    });
  });

  it('should initialize with signMessage function', () => {
    client = bitstore({
      network: 'testnet',
      address: 'n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU',
      signMessage: (message) => {
        const key = bitcoin.ECKey.fromWIF('KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS');
        const network = bitcoin.networks.testnet;
        return bitcoin.Message.sign(key, message, network).toString('base64');
      },
    });
  });

  it('should get wallet', (done) => {
    client.wallet.get((err, wallet) => {
      if (err) return done(err);
      expect(wallet.address).to.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      expect(wallet.total_balance).to.be.a('number');
      done();
    });
  });

  it('should initialize with async signMessage function', () => {
    client = bitstore({
      network: 'testnet',
      address: 'n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU',
      signMessage: (message, cb) => {
        const key = bitcoin.ECKey.fromWIF('KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS');
        const network = bitcoin.networks.testnet;
        setImmediate(() => {
          cb(null, bitcoin.Message.sign(key, message, network).toString('base64'));
        });
      },
    });
  });

  it('should get wallet', (done) => {
    client.wallet.get((err, wallet) => {
      if (err) return done(err);
      expect(wallet.address).to.equal('n3PDRtKoHXHNt8FU17Uu9Te81AnKLa7oyU');
      expect(wallet.total_balance).to.be.a('number');
      done();
    });
  });
});
