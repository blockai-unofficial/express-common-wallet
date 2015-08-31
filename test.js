var test = require("tape");
var request = require('request');
var express = require('express');

var verifyCommonWallet = require("./");
var port = 3434;

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

var app = express();

app.use("/", verifyCommonWallet({
  commonWalletNonceStore: commonWalletNonceStore
}));

var serverRootUrl = "http://localhost:" + port;

var testCommonWallet = require('test-common-wallet');

var commonBlockchain = require('mem-common-blockchain');

var commonWallet = testCommonWallet({
  seed: "test",
  network: "testnet",
  commonBlockchain: commonBlockchain
});

test("should get nonce", function(t) {
  var server = app.listen(port, function() {
    commonWallet.login(serverRootUrl, function(err, res, body) {
      var nonce = res.headers['x-common-wallet-nonce'];
      t.ok(nonce, "has nonce");
      server.close();
      t.end();
    })
  });
});

test("should login", function(t) {
  var server = app.listen(port, function() {
    commonWallet.login(serverRootUrl, function(err, res, body) {
      var nonce = res.headers['x-common-wallet-nonce'];
      t.ok(nonce, "has nonce");
      commonWallet.request({host: serverRootUrl, path: "/nonce" }, function(err, res, body) {
        var verifiedAddress = res.headers['x-common-wallet-verified-address'];
        t.equal(commonWallet.address, verifiedAddress, "verified address");
        server.close();
        t.end();
      });
    })
  });
});