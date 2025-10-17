const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 DEPLOYING FIXED ROUTER");
    
    const [deployer] = await ethers.getSigners();
    const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
    
    console.log("Deploying with:", deployer.address);
    
    // Deploy new fixed router
    const MockRouterFixed = await ethers.getContractFactory("MockRouterFixed");
    const currentPrice = 2200; // $2200 per WETH
    const rate = BigInt(1e18) / BigInt(currentPrice); // 0.000454545... with 18 decimals
    
    console.log(`Rate for $${currentPrice}/WETH: ${rate}`);
    
    const newRouter = await MockRouterFixed.deploy(
        addresses.usdc, 
        addresses.weth, 
        rate
    );
    await newRouter.waitForDeployment();
    
    const newRouterAddr = await newRouter.getAddress();
    console.log("MockRouterFixed deployed to:", newRouterAddr);
    
    // Fund the new router with tokens from the old router
    const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
    const weth = await ethers.getContractAt("MockERC20", addresses.weth);
    
    // Transfer some tokens to new router for liquidity
    console.log("Funding new router with liquidity...");
    const deployerUsdcBal = await usdc.balanceOf(deployer.address);
    const deployerWethBal = await weth.balanceOf(deployer.address);
    
    console.log(`Deployer USDC: ${ethers.formatUnits(deployerUsdcBal, 6)}`);
    console.log(`Deployer WETH: ${ethers.formatUnits(deployerWethBal, 18)}`);
    
    if (deployerUsdcBal > 0) {
        const usdcToTransfer = deployerUsdcBal > ethers.parseUnits("100000", 6) ? 
            ethers.parseUnits("100000", 6) : deployerUsdcBal;
        await usdc.transfer(newRouterAddr, usdcToTransfer);
        console.log(`Transferred ${ethers.formatUnits(usdcToTransfer, 6)} USDC`);
    }
    
    if (deployerWethBal > 0) {
        const wethToTransfer = deployerWethBal > ethers.parseUnits("10", 18) ? 
            ethers.parseUnits("10", 18) : deployerWethBal;
        await weth.transfer(newRouterAddr, wethToTransfer);
        console.log(`Transferred ${ethers.formatUnits(wethToTransfer, 18)} WETH`);
    } else {
        // Mint some WETH for the router
        await weth.mint(newRouterAddr, ethers.parseUnits("100", 18));
        console.log("Minted 100 WETH for router");
    }
    
    // Update addresses file
    addresses.router = newRouterAddr;
    fs.writeFileSync("deployed_addresses.json", JSON.stringify(addresses, null, 2));
    
    console.log("✅ Fixed router deployed and addresses updated!");
    
    // Test the calculation
    const testAmount = ethers.parseUnits("100", 6); // 100 USDC
    const expectedOutput = (testAmount * rate) / BigInt(1000000);
    console.log(`Test calculation: 100 USDC → ${ethers.formatUnits(expectedOutput, 18)} WETH`);
    console.log(`Value: $${(parseFloat(ethers.formatUnits(expectedOutput, 18)) * currentPrice).toFixed(2)}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});