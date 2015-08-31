var express = require('express');
var bitcoin = require('bitcoinjs-lib');
var secureRandom = require('secure-random');

module.exports = function(options) {
  
  var app = express();
  var router = express.Router();
  var commonWalletNonceStore = options.commonWalletNonceStore;

  router.use(function(req, res, next) {
    var method = req.method && req.method.toUpperCase && req.method.toUpperCase();
    var address = req.headers["x-common-wallet-address"];
    var network = req.headers["x-common-wallet-network"] == "testnet" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    var signedNonce = req.headers["x-common-wallet-signed-nonce"];
    var setNonce = function(callback) {
      if (address) {
        var nonce = secureRandom.randomBuffer(20).toString("hex");
        commonWalletNonceStore.set(address, nonce, function(err, resp) {
          if (err) {
            return res.status(500).send("Error");
          }
          res.setHeader("x-common-wallet-nonce", nonce);
          callback();
        });
      }
      else {
        callback();
      }
    }
    if (signedNonce) {
      commonWalletNonceStore.get(address, function(err, nonce) {
        if (err) {
          return res.status(500).send("Error");
        }
        if (nonce) {
          if (bitcoin.Message.verify(address, signedNonce, nonce, network)) {
            req.verifiedAddress = address;
            res.setHeader("x-common-wallet-verified-address", address);
          }
        }
        setNonce(next);
      });
    }
    else {
      setNonce(next);
    }
  });

  router.get("/nonce", function(req, res) {
    res.status(200).send("ok");
  });

  return router;

}