# express-common-wallet
Express middleware for supporting authentication of Common Wallet remote requests.

## About

This module interfaces with Bitcoin wallets that support the [Common Wallet](https://github.com/blockai/abstract-common-wallet) interface.

Specifically, it interfaces with the ```commonWallet.login``` function, which authenticates with the server by retrieving and signing a nonce with ```commonWallet.signMessage```, and ```commonWallet.request```, which wraps the ```request``` module with authentication headers related to these signed nonces.

As a precaution against replay attacks a new nonce is created after every request.

## Usage

### Express server

```npm install express-common-wallet```

This express router middleware requires a permanent key-value store to associate public Bitcoin wallet addresses with a randomly generated nonce.

For this example, we'll use a simple in-memory store, but we recommend using something like DynamoDB, Redis or Postgres.

```js
var __nonces = {};
var commonWalletNonceStore = {
  get: function(address, callback) {
    callback(false, __nonces[address]);
  },
  set: function(address, nonce, callback) {
    __nonces[address] = nonce;
    callback(false, true);
  }
}
```

This ```commonWalletNonceStore``` is passed in as an option to an instance of our Express router middleware.

It creates a ```/nonce``` route at the root of the application, which is used by compatible clients to

```js
var express = require('express');
var expressCommonWallet = require('express-common-wallet');

var app = express();

app.use("/", expressCommonWallet({
  commonWalletNonceStore: commonWalletNonceStore
}));
```

Using a compatible client will result in a ```req.verifiedAddress``` attribute added to the express request object, allowing for additional routes to check for authorized wallets.

```js
app.get("/test", function(req, res) {
  var verifiedAddress = req.verifiedAddress;
  if (!verifiedAddress) {
    return res.status(401).send("Unauthorized");
  } 
  ...
});
```

### commonWallet client

Compliant commonWallet clients have support for both ```login()``` and ```request()``` functions that are compatible with this module.

In this example we'll be using the [```test-common-wallet```](https://github.com/blockai/test-common-wallet) reference implementation.

```js
var commonBlockchain = require('mem-common-blockchain');
var testCommonWallet = require('test-common-wallet');

var commonWallet = testCommonWallet({
  seed: "testing123",
  network: "testnet",
  commonBlockchain: commonBlockchain
});
```

#### login

This function retrieves and stores a nonce from the ```/nonce``` route created by the ```expressCommonWallet``` router middleware.

```js
commonWallet.login("http://localhost:5454", function(err, res, body) {
  
});
```

#### request

This function wraps the ```request``` module with various headers that return the nonce signed by the commonWallet.

```js
commonWallet.request({host: "http://localhost:5454", path: "/test" }, function(err, res, body) {

});
```

This method should support the full API for request, including the POST method.

```js
commonWallet.request({host: "http://localhost:5454", path: "/testPost/", method:"POST", form: {"key": "value"} }, function(err, res, body) {

});
```

For more information about the implementation details, please consult the tests in [```abstract-common-wallet```](https://github.com/blockai/abstract-common-wallet/blob/master/tests/tests.js) as well as the reference implementation in [```test-common-wallet```](https://github.com/blockai/test-common-wallet/blob/master/src/commonWallet.js).
  
