 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.18;
 import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

 /// @notice Very small router that swaps token A for token B given a synthetic rate stored in contract.
 /// Assumes TokenA (USDC) has 6 decimals and TokenB (WETH) has 18 decimals.
 contract MockRouter {
     address public immutable tokenA;
     address public immutable tokenB;
     // rate: tokenB per tokenA * 1e18 (The rate is scaled for 18 decimals)
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
         
         // FIX: Correct decimal scaling calculation for 6-decimal input to 18-decimal output.
         // Division by 1e24 is required (1e6 * 1e18). Since 1e24 is an unsafe literal, 
         // we split the division using safe 1e18 and 1e6 literals.
         uint256 numerator = amountIn * rate;

         // Divide by 1e18 (rate scaling)
         uint256 intermediate = numerator / 1000000000000000000;
         
         // Divide by 1e6 (TokenA decimal scaling)
         amountOut = intermediate / 1000000;

         require(amountOut > 0, "Amount out is zero"); 
         require(IERC20(tokenB).transfer(to, amountOut), "transfer B failed");
         emit Swap(from, to, amountIn, amountOut);
     }

     /// @notice deposit tokens to router to seed liquidity
     function deposit(address token, uint256 amount) external {
         IERC20(token).transferFrom(msg.sender, address(this), amount);
     }
 }
