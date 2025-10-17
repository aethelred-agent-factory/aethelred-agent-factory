import hre from "hardhat";
const { ethers } = hre;

// Test the calculation
const amountIn = ethers.parseUnits("100", 6); // 100 USDC
const rate = ethers.parseUnits("0.0005", 18); // 0.0005 WETH per USDC
console.log("Testing with current rate...");
let numerator = amountIn * rate;
let intermediate = numerator / BigInt("1000000000000000000"); // 1e18
let amountOut = intermediate / BigInt("1000000"); // 1e6
console.log(`Current result: ${amountOut} (${ethers.formatUnits(amountOut, 18)} WETH)`);

console.log("\nTesting with better rate (0.0001 WETH per USDC)...");
const betterRate = ethers.parseUnits("0.0001", 18);

console.log("Testing calculation:");
console.log(`Amount In: ${amountIn} (${ethers.formatUnits(amountIn, 6)} USDC)`);
console.log(`Rate: ${rate} (${ethers.formatUnits(rate, 18)} WETH per USDC)`);

const numerator = amountIn * rate;
console.log(`Numerator: ${numerator}`);

const intermediate = numerator / BigInt("1000000000000000000"); // 1e18
console.log(`Intermediate: ${intermediate}`);

const amountOut = intermediate / BigInt("1000000"); // 1e6
console.log(`Amount Out: ${amountOut} (${ethers.formatUnits(amountOut, 18)} WETH)`);