// Mainnet contract addresses
export const MAINNET_ADDRESSES = {
  // ERC20 Tokens
  USDC: "0xA0b86a33E6D76Bdf7bEce9EA5D56EC4C5Dd5d21B",  // USDC
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // WETH
  
  // Uniswap V3
  UNISWAP_V3_FACTORY: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  UNISWAP_V3_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  USDC_WETH_POOL_03: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // 0.3% fee
  USDC_WETH_POOL_05: "0x7BeA39867e4169DBe237d55C8242a8f2fcDcc387", // 0.05% fee
  
  // Chainlink Price Feeds
  ETH_USD_FEED: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  USDC_USD_FEED: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  
  // Common addresses that hold large amounts for testing
  WHALES: {
    USDC: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503", // Binance
    WETH: "0x8EB8a3b98659Cce290402893d0123abb75E3ab28", // Avalanche Bridge
  },
  
  // Uniswap V2 (backup)
  UNISWAP_V2_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  UNISWAP_V2_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
};

// ABIs for mainnet contracts
export const MAINNET_ABIS = {
  ERC20: [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address, uint256) returns (bool)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
  ],
  
  CHAINLINK_FEED: [
    "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
    "function decimals() view returns (uint8)"
  ],
  
  UNISWAP_V3_POOL: [
    "function slot0() view returns (uint160, int24, uint16, uint16, uint16, uint8, bool)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function fee() view returns (uint24)"
  ],
  
  UNISWAP_V3_ROUTER: [
    "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) payable returns (uint256)"
  ]
};