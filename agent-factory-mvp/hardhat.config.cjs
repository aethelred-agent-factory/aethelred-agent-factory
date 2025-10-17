require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// HardhatUserConfig is inferred by Hardhat, no need to import it explicitly
const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: {
        count: 20
      },
      forking: process.env.ALCHEMY_RPC_URL ? {
        url: process.env.ALCHEMY_RPC_URL,
        blockNumber: 21037500, // Recent block for consistent testing
      } : undefined
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    mainnetFork: {
      url: "http://127.0.0.1:8545", 
      chainId: 1337
    }
  }
};

module.exports = config;
