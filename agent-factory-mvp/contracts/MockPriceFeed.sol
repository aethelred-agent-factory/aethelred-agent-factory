 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.18;

 contract MockPriceFeed {
     // WETH/USD price with 1e18 precision, e.g., 2000 * 1e18
     uint256 public price;

     event PriceUpdated(uint256 newPrice);

     constructor(uint256 initial) {
         price = initial;
     }

     function setPrice(uint256 newPrice) external {
         price = newPrice;
         emit PriceUpdated(newPrice);
     }

     function getPrice() external view returns (uint256) {
         return price;
     }
 }
