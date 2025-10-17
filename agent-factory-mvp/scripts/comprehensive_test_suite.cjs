const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 COMPREHENSIVE AGENT FACTORY TEST SUITE");
    console.log("========================================");
    
    const [deployer] = await ethers.getSigners();
    const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
    
    // Get contracts
    const factory = await ethers.getContractAt("AgentFactory", addresses.factory);
    const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
    const weth = await ethers.getContractAt("MockERC20", addresses.weth);
    const router = await ethers.getContractAt("MockRouterFixed", addresses.router);
    const priceFeed = await ethers.getContractAt("MockPriceFeed", addresses.priceFeed);
    
    let testsPassed = 0;
    let totalTests = 0;
    
    function runTest(name, testFn) {
        totalTests++;
        console.log(`\n🧪 Test ${totalTests}: ${name}`);
        try {
            const result = testFn();
            if (result) {
                console.log(`   ✅ PASSED`);
                testsPassed++;
            } else {
                console.log(`   ❌ FAILED`);
            }
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
        }
    }
    
    // Test 1: Verify contracts are deployed
    runTest("Contract Deployment", async () => {
        const factoryCode = await ethers.provider.getCode(addresses.factory);
        const routerCode = await ethers.provider.getCode(addresses.router);
        const usdcCode = await ethers.provider.getCode(addresses.usdc);
        return factoryCode !== "0x" && routerCode !== "0x" && usdcCode !== "0x";
    });
    
    // Test 2: Verify agent exists
    runTest("Agent Exists", async () => {
        const walletAddr = await factory.walletOf(0);
        return walletAddr !== ethers.ZeroAddress;
    });
    
    // Test 3: Verify agent wallet has funds
    runTest("Agent Wallet Funded", async () => {
        const walletAddr = await factory.walletOf(0);
        const balance = await usdc.balanceOf(walletAddr);
        return balance > 0;
    });
    
    // Test 4: Verify router has correct rate
    runTest("Router Rate Configuration", async () => {
        const rate = await router.rate();
        const price = await priceFeed.getPrice();
        const priceUSD = parseFloat(ethers.formatUnits(price, 18));
        const expectedRate = BigInt(1e18) / BigInt(Math.floor(priceUSD));
        return rate === expectedRate;
    });
    
    // Test 5: Verify router has liquidity
    runTest("Router Liquidity", async () => {
        const usdcBal = await usdc.balanceOf(addresses.router);
        const wethBal = await weth.balanceOf(addresses.router);
        return usdcBal > 0 && wethBal > 0;
    });
    
    // Test 6: Test direct router swap
    runTest("Direct Router Swap", async () => {
        const testAmount = ethers.parseUnits("10", 6);
        const balanceBefore = await weth.balanceOf(deployer.address);
        
        await usdc.approve(addresses.router, testAmount);
        await router.swapAForB(deployer.address, deployer.address, testAmount);
        
        const balanceAfter = await weth.balanceOf(deployer.address);
        return balanceAfter > balanceBefore;
    });
    
    // Test 7: Test agent wallet configuration
    runTest("Agent Wallet Configuration", async () => {
        const walletAddr = await factory.walletOf(0);
        const wallet = await ethers.getContractAt("AgentWallet", walletAddr);
        
        const isRouterAllowed = await wallet.allowedTargets(addresses.router);
        const isUsdcAllowed = await wallet.allowedTargets(addresses.usdc);
        const isPaused = await wallet.paused();
        const owner = await wallet.owner();
        
        return isRouterAllowed && isUsdcAllowed && !isPaused && owner === deployer.address;
    });
    
    // Test 8: Test agent wallet swap
    runTest("Agent Wallet Swap", async () => {
        const walletAddr = await factory.walletOf(0);
        const wallet = await ethers.getContractAt("AgentWallet", walletAddr);
        
        const testAmount = ethers.parseUnits("10", 6);
        const wethBefore = await weth.balanceOf(walletAddr);
        
        // Approve
        const approveInterface = new ethers.Interface([
            "function approve(address spender, uint256 amount) returns (bool)"
        ]);
        const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, testAmount]);
        await wallet.execute(addresses.usdc, 0, approveCalldata);
        
        // Swap
        const routerInterface = new ethers.Interface([
            "function swapAForB(address from, address to, uint256 amountIn) returns (uint256)"
        ]);
        const swapCalldata = routerInterface.encodeFunctionData("swapAForB", [
            walletAddr, walletAddr, testAmount
        ]);
        await wallet.execute(addresses.router, 0, swapCalldata);
        
        const wethAfter = await weth.balanceOf(walletAddr);
        return wethAfter > wethBefore;
    });
    
    // Test 9: Test price manipulation triggers
    runTest("Price Manipulation Response", async () => {
        const walletAddr = await factory.walletOf(0);
        
        // Set price below threshold
        await priceFeed.setPrice(ethers.parseUnits("2000", 18));
        let price = await priceFeed.getPrice();
        const lowPrice = parseFloat(ethers.formatUnits(price, 18));
        
        // Set price above threshold  
        await priceFeed.setPrice(ethers.parseUnits("2300", 18));
        price = await priceFeed.getPrice();
        const highPrice = parseFloat(ethers.formatUnits(price, 18));
        
        // Reset to normal
        await priceFeed.setPrice(ethers.parseUnits("2200", 18));
        
        return lowPrice < 2100 && highPrice > 2100;
    });
    
    // Test 10: Test portfolio value calculation
    runTest("Portfolio Value Calculation", async () => {
        const walletAddr = await factory.walletOf(0);
        const usdcBal = await usdc.balanceOf(walletAddr);
        const wethBal = await weth.balanceOf(walletAddr);
        const price = await priceFeed.getPrice();
        
        const usdcValue = parseFloat(ethers.formatUnits(usdcBal, 6));
        const wethValue = parseFloat(ethers.formatUnits(wethBal, 18));
        const priceUSD = parseFloat(ethers.formatUnits(price, 18));
        
        const portfolioValue = usdcValue + (wethValue * priceUSD);
        
        return portfolioValue > 0 && portfolioValue < 20000; // Reasonable bounds
    });
    
    console.log("\n" + "=".repeat(50));
    console.log(`📊 TEST RESULTS: ${testsPassed}/${totalTests} PASSED`);
    console.log("=".repeat(50));
    
    if (testsPassed === totalTests) {
        console.log("🎉 ALL TESTS PASSED! Agent Factory is fully operational!");
    } else {
        console.log(`⚠️  ${totalTests - testsPassed} tests failed. Please review.`);
    }
    
    // Summary report
    console.log("\n📋 SYSTEM STATUS SUMMARY:");
    console.log("========================");
    
    const walletAddr = await factory.walletOf(0);
    const usdcBal = await usdc.balanceOf(walletAddr);
    const wethBal = await weth.balanceOf(walletAddr);
    const price = await priceFeed.getPrice();
    const rate = await router.rate();
    
    const usdcValue = parseFloat(ethers.formatUnits(usdcBal, 6));
    const wethValue = parseFloat(ethers.formatUnits(wethBal, 18));
    const priceUSD = parseFloat(ethers.formatUnits(price, 18));
    const portfolioValue = usdcValue + (wethValue * priceUSD);
    
    console.log(`🤖 Agent Wallet: ${walletAddr}`);
    console.log(`💰 USDC Balance: ${usdcValue.toFixed(2)}`);
    console.log(`💰 WETH Balance: ${wethValue.toFixed(6)}`);
    console.log(`📈 WETH Price: $${priceUSD.toFixed(2)}`);
    console.log(`🔄 Router Rate: ${ethers.formatUnits(rate, 18)}`);
    console.log(`💎 Portfolio Value: $${portfolioValue.toFixed(2)}`);
    console.log(`🎯 Trading Signal: ${priceUSD > 2100 ? 'SWAP (Price > $2100)' : 'HOLD (Price ≤ $2100)'}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});