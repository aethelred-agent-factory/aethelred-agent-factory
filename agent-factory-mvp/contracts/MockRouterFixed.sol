// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Fixed router that properly handles decimal conversion
contract MockRouterFixed {
    address public immutable tokenA;
    address public immutable tokenB;
    // rate: tokenB per tokenA with 18 decimals (e.g., 0.00045454 * 1e18 for $2200/WETH)
    uint256 public rate; 

    event Swap(address indexed from, address indexed to, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA, address _tokenB, uint256 _initialRate) {
        tokenA = _tokenA;
        tokenB = _tokenB;
        rate = _initialRate;
    }

    function setRate(uint256 newRate) external {
        rate = newRate;
    }

    /// @notice swap tokenA (6 decimals) -> tokenB (18 decimals) at 'rate' (18 decimals scaled)
    function swapAForB(address from, address to, uint256 amountIn) external returns (uint256 amountOut) {
        require(IERC20(tokenA).transferFrom(from, address(this), amountIn), "transferFrom failed");
        
        // Convert 6-decimal USDC input to 18-decimal WETH output
        // amountIn is in 6 decimals, rate is per-unit with 18 decimals
        // We need to scale up by 12 decimals: (amountIn * rate * 1e12) / 1e18
        // Simplified: (amountIn * rate) / 1e6
        amountOut = (amountIn * rate) / 1000000;

        require(amountOut > 0, "Amount out is zero"); 
        require(IERC20(tokenB).transfer(to, amountOut), "transfer B failed");
        emit Swap(from, to, amountIn, amountOut);
    }

    /// @notice deposit tokens to router to seed liquidity
    function deposit(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
}