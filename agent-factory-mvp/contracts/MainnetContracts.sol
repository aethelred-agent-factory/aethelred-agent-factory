// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Interface for Chainlink Price Feed
interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

// Interface for Uniswap V3 Pool
interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

// Real price feed contract that can use multiple sources
contract RealPriceFeed {
    AggregatorV3Interface public chainlinkFeed;
    IUniswapV3Pool public uniswapPool;
    bool public useChainlink;
    
    // Chainlink ETH/USD: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
    // Uniswap V3 USDC/WETH Pool: 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8
    
    constructor(address _chainlinkFeed, address _uniswapPool) {
        chainlinkFeed = AggregatorV3Interface(_chainlinkFeed);
        uniswapPool = IUniswapV3Pool(_uniswapPool);
        useChainlink = true;
    }
    
    function setSource(bool _useChainlink) external {
        useChainlink = _useChainlink;
    }
    
    function getPrice() external view returns (uint256) {
        if (useChainlink) {
            return getChainlinkPrice();
        } else {
            return getUniswapPrice();
        }
    }
    
    function getChainlinkPrice() public view returns (uint256) {
        (, int256 price, , , ) = chainlinkFeed.latestRoundData();
        uint8 decimals = chainlinkFeed.decimals();
        
        // Convert to 18 decimals (Chainlink ETH/USD is 8 decimals)
        return uint256(price) * 10**(18 - decimals);
    }
    
    function getUniswapPrice() public view returns (uint256) {
        (uint160 sqrtPriceX96, , , , , , ) = uniswapPool.slot0();
        
        // Convert sqrtPriceX96 to actual price
        // Price = (sqrtPriceX96 / 2^96)^2
        uint256 price = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) / (2**192);
        
        // Adjust for token decimals (USDC=6, WETH=18)
        // This gives us USDC per WETH, we want USD per ETH
        return price * 10**12; // Convert to 18 decimals
    }
}