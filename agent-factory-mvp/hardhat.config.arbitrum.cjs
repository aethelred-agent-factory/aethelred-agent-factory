require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000, // Optimized for production deployment
      },
      viaIR: true, // Enable intermediate representation for better optimization
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    "arbitrum-sepolia": {
      url: "https://arb-sepolia.g.alchemy.com/v2/G-0JsbpcHJNVzXSWr67Jv1ZoGMq7VELg",
      accounts: ["0xf74e7e0befcf6dbda6961a306b11753c9a7d080b3f53e8c126cb95c879587cb4"],
      chainId: 421614,
      gasPrice: 1000000000, // 1 gwei
      gas: 10000000, // 10M gas limit
      timeout: 120000, // 2 minute timeout
    },
    "arbitrum-mainnet": {
      url: "https://arb-mainnet.g.alchemy.com/v2/your-api-key-here",
      accounts: [], // Add mainnet private key when ready
      chainId: 42161,
      gasPrice: "auto",
    }
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: "your-arbiscan-api-key", // For contract verification
      arbitrumOne: "your-arbiscan-api-key"
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      }
    ]
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 1, // 1 gwei for Arbitrum
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  mocha: {
    timeout: 120000, // 2 minutes for Arbitrum tests
  },
};