# bitstore-client

A Javascript client for bitstore.

# Install

`npm install -g bitstore-client`

# Usage

Usage: `PRIVATEKEY=somekey NETWORK=testnet bitstore action`

Actions:

put <path> Upload a file

Example:

`PRIVATEKEY=KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS bitstore put ./README.md`

Testing:

`HOST=http://docker:3000 PRIVATEKEY=KyjhazeX7mXpHedQsKMuGh56o3rh8hm8FGhU3H6HPqfP9pA4YeoS ./src/cli.js put ./README.md`
