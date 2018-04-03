require('babel-register');
require('babel-polyfill');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
      gasPrice: 1000000000
    },
    mainnet: {
      host: "127.0.0.1", // config for geth light
      port: 8545,
      network_id: 1, // mainnet
      gasPrice: 4000000000, // 4 Gwei
      from: "0x4b30A86EeC6e6Ac87fA8B433619C67588f18dbB8" // address with which the smart contract for 1000ethhomepage.com was deployed to the mainnet
    },

  }
};
