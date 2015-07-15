# bitstore

A content-addressable cloud storage web service that uses Bitcoin public key infrastructure for authentication and payment.

The basic idea is that customers pay for the storage and retrieval costs of their digital media. Here at Blockai we are committed to building consumer products that never rely on advertising or selling personal data to third-party companies to cover our costs. In essence, we're building products where people own their own content and with that comes taking on financial responsibility.

How it works is a customer sends a small amount of Bitcoin to a deposit address provided by Bitstore and their account is immediately credited. Once their credits are in place they are free to store and retrieve media on a per-file and per-use basis. Once a customer's credits have been used up the file is no longer available for retrieval, however anyone can make a deposit to any account.

If we did our math correctly it currently costs about 1/3rd of a cent to upload a photograph and distribute a 100 copies but I expect adjustments to our initial pricing mechanism. Needless to say, using Bitstore will cost very little and we don't really expect people to purchase more than a few dollars worth of credits, depending on their distribution needs.

## Content-addressable

Content-addressable means that the file is referenced not by a name but by a cryptographic hash of the contents. Bitstore supports MD5, SHA-1, SHA-256 and BitTorrent Info Hash as identifiers.

Every digital file has a unique hash. Think of it like a fingerprint. If any of the bits in the file change, the fingerprint changes. This property is great for tracking different versions of files and is employed by revision control systems like git.

# Install

`npm install bitstore-client`

# Browser Usage

In our examples we're going to use ```bitcoinjs-lib``` to create our wallet.

## Bitcoin Wallet

```javascript
var bitcoin = require("bitcoinjs-lib");

var seed = bitcoin.crypto.sha256("test");
var wallet = new bitcoin.Wallet(seed, bitcoin.networks.testnet);
var address = wallet.generateAddress();

var signRawTransaction = function(txHex, cb) {
  var tx = bitcoin.Transaction.fromHex(txHex);
  var signedTx = wallet.signWith(tx, [address]);
  var txid = signedTx.getId();
  var signedTxHex = signedTx.toHex();
  cb(false, signedTxHex, txid);
};

var signMessage = function (message, cb) {
  var key = wallet.getPrivateKey(0);
  var network = bitcoin.networks.testnet;
  cb(null, bitcoin.Message.sign(key, message, network).toString('base64'));
};

var commonWallet = {
  network: 'testnet',
  signMessage: signMessage,
  signRawTransaction: signRawTransaction,
  address: address
}
```

We'll need to provide an instance of a commonBlockchain which will provide functions for signing a transaction, propagating a trasnaction, and looking up a transaction by ```txid```.

In this example we're using a testnet version that is provided by ```blockcypher-unofficial```.

```javascript
var commonBlockchain = require('blockcypher-unofficial')({
  network: "testnet"
});
```

## Bitstore Client

The Bitstore client uses a Bitcoin wallet to sign tokens for identification and to authorize with the Bitstore servers. In effect your Bitcoin wallet address is your ID.

```javascript
var bitstore = require('bitstore');

var bitstoreClient = bitstore(commonWallet);

var bitstoreDepositAddress, bitstoreBalance;

bitstoreClient.wallet.get(function (err, res) {
  bitstoreDepositAddress = res.body.deposit_address;
  bitstoreBalance = res.body.balance;
});
```

## Send Bitcoin to Bitstore Deposit Address

Bitstore is a pay-per-use, per-file service and needs Bitcoin in order to operate.

We need to send some Bitcoin from our brain wallet to the Bitstore deposit address in order to top up our balance.

```javascript
var newTx = wallet.createTx(bitstoreDepositAddress, 100000, 1000, address);
var signedTx = wallet.signWith(newTx, [address]);
var signedTxHex = signedTx.toHex();

commonBlockchain.Transactions.Propagate(signedTxHex, function(err, receipt) {
  console.log("propagation receipt", receipt);
});

```

## Upload file to Bitstore

Once your Bitstore account has some credits you can start uploading files.

```javascript
var file; // a browser File object returned from drop or file select form

var hash_sha1, hash_sha256, hash_btih, uri, size, torrent;

bitstoreClient.files.put(file, function (err, res) {
  var receipt = res.body;
  hash_sha1 = receipt.hash_sha1;
  hash_sha256 = receipt.hash_sha256;
  hash_btih = receipt.hash_btih;
  uri = receipt.uri;
  size = receipt.size;
  torrent = receipt.torrent;
});
```

# Command Line Usage

Usage: `PRIVATEKEY=somekey NETWORK=testnet bitstore action`

Actions:

put <path> Upload a file

Example:

`PRIVATEKEY=KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS bitstore put ./README.md`

Testing:

`HOST=http://docker:3000 PRIVATEKEY=KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS ./src/cli.js put ./README.md`
