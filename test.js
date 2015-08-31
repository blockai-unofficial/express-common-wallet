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

var hosts = {};

commonWallet.request = function(host, path, callback) {
  var nonce = hosts[host].nonce;
  commonWallet.signMessage(nonce, function(err, signedNonce) {
    request({
      url: host + path,
      headers: {
        'x-common-wallet-address': commonWallet.address,
        'x-common-wallet-network': commonWallet.network,
        'x-common-wallet-signed-nonce': signedNonce
      }
    }, function(err, res, body) {
      hosts[host] = {
        nonce: res.headers['x-common-wallet-nonce'],
        verifiedAddress: res.headers['x-common-wallet-verified-address']
      };
      callback(err, res, body);
    });
  });
};

commonWallet.login = function(host, callback) {
  request({
    url: host + "/nonce",
    headers: {
      'x-common-wallet-address': commonWallet.address,
      'x-common-wallet-network': "testnet"
    }
  }, function(err, res, body) {
    hosts[host] = {
      nonce: res.headers['x-common-wallet-nonce']
    };
    callback(err, res, body);
  });
};

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
      commonWallet.request(serverRootUrl, "/nonce", function(err, res, body) {
        var verifiedAddress = res.headers['x-common-wallet-verified-address'];
        t.equal(commonWallet.address, verifiedAddress, "verified address");
        server.close();
        t.end();
      });
    })
  });
});