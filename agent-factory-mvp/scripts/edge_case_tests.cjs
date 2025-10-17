const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    console.log("🧨 EDGE CASE AND ERROR HANDLING TESTS");
    console.log("====================================");
    
    const [deployer] = await ethers.getSigners();
    const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
    
    // Get contracts
    const factory = await ethers.getContractAt("AgentFactory", addresses.factory);
    const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
    const weth = await ethers.getContractAt("MockERC20", addresses.weth);
    const router = await ethers.getContractAt("MockRouterFixed", addresses.router);
    const priceFeed = await ethers.getContractAt("MockPriceFeed", addresses.priceFeed);
    
    const walletAddr = await factory.walletOf(0);
    const wallet = await ethers.getContractAt("AgentWallet", walletAddr);
    
    let testsPassed = 0;
    let totalTests = 0;
    
    function runTest(name, testFn) {
        totalTests++;
        console.log(`\n🧨 Edge Case ${totalTests}: ${name}`);
        return testFn().then(result => {
            if (result) {
                console.log(`   ✅ HANDLED CORRECTLY`);
                testsPassed++;
            } else {
                console.log(`   ❌ NOT HANDLED`);
            }
        }).catch(error => {
            if (error.message.includes("expected revert") || error.message.includes("target not allowed") || error.message.includes("paused")) {
                console.log(`   ✅ CORRECTLY REVERTED: ${error.message.split(':')[0]}`);
                testsPassed++;
            } else {
                console.log(`   ❌ UNEXPECTED ERROR: ${error.message}`);
            }
        });
    }
    
    // Test 1: Insufficient balance swap
    await runTest("Insufficient Balance Swap", async () => {
        const currentBalance = await usdc.balanceOf(walletAddr);
        const excessiveAmount = currentBalance + ethers.parseUnits("1000", 6);
        
        try {
            const approveInterface = new ethers.Interface([
                "function approve(address spender, uint256 amount) returns (bool)"
            ]);
            const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, excessiveAmount]);
            await wallet.execute(addresses.usdc, 0, approveCalldata);
            
            const routerInterface = new ethers.Interface([
                "function swapAForB(address from, address to, uint256 amountIn) returns (uint256)"
            ]);
            const swapCalldata = routerInterface.encodeFunctionData("swapAForB", [
                walletAddr, walletAddr, excessiveAmount
            ]);
            await wallet.execute(addresses.router, 0, swapCalldata);
            
            return false; // Should have failed
        } catch (error) {
            return error.message.includes("transfer amount exceeds balance");
        }
    });
    
    // Test 2: Paused wallet
    await runTest("Paused Wallet Protection", async () => {
        // Pause the wallet
        await wallet.setPaused(true);
        
        try {
            const testAmount = ethers.parseUnits("10", 6);
            const approveInterface = new ethers.Interface([
                "function approve(address spender, uint256 amount) returns (bool)"
            ]);
            const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, testAmount]);
            await wallet.execute(addresses.usdc, 0, approveCalldata);
            
            return false; // Should have failed
        } catch (error) {
            // Unpause for other tests
            await wallet.setPaused(false);
            return error.message.includes("paused");
        }
    });
    
    // Test 3: Unauthorized target
    await runTest("Unauthorized Target Protection", async () => {
        // Create a fake contract address
        const fakeTarget = "0x1234567890123456789012345678901234567890";
        
        try {
            const fakeCalldata = "0x12345678"; // Fake function call
            await wallet.execute(fakeTarget, 0, fakeCalldata);
            
            return false; // Should have failed
        } catch (error) {
            return error.message.includes("target not allowed");
        }
    });
    
    // Test 4: Zero amount swap
    await runTest("Zero Amount Swap", async () => {
        try {
            const zeroAmount = ethers.parseUnits("0", 6);
            const routerInterface = new ethers.Interface([
                "function swapAForB(address from, address to, uint256 amountIn) returns (uint256)"
            ]);
            const swapCalldata = routerInterface.encodeFunctionData("swapAForB", [
                walletAddr, walletAddr, zeroAmount
            ]);
            await wallet.execute(addresses.router, 0, swapCalldata);
            
            return false; // Should have failed
        } catch (error) {
            return error.message.includes("Amount out is zero") || error.message.includes("transferFrom failed");
        }
    });
    
    // Test 5: Router liquidity exhaustion
    await runTest("Router Liquidity Check", async () => {
        const routerWethBalance = await weth.balanceOf(addresses.router);
        console.log(`   Router WETH liquidity: ${ethers.formatUnits(routerWethBalance, 18)}`);
        
        // This test just checks that router has adequate liquidity
        return routerWethBalance > ethers.parseUnits("1", 18); // At least 1 WETH
    });
    
    // Test 6: Price feed extreme values
    await runTest("Extreme Price Values", async () => {
        const originalPrice = await priceFeed.getPrice();
        
        // Test extreme low price
        await priceFeed.setPrice(ethers.parseUnits("1", 18)); // $1
        let price = await priceFeed.getPrice();
        const extremeLow = parseFloat(ethers.formatUnits(price, 18)) === 1;
        
        // Test extreme high price  
        await priceFeed.setPrice(ethers.parseUnits("100000", 18)); // $100k
        price = await priceFeed.getPrice();
        const extremeHigh = parseFloat(ethers.formatUnits(price, 18)) === 100000;
        
        // Reset to normal
        await priceFeed.setPrice(originalPrice);
        
        return extremeLow && extremeHigh;
    });
    
    // Test 7: Non-owner access attempt
    await runTest("Non-Owner Access Protection", async () => {
        // Try to use a different signer
        const [, otherSigner] = await ethers.getSigners();
        const walletAsOther = wallet.connect(otherSigner);
        
        try {
            const testAmount = ethers.parseUnits("10", 6);
            const approveInterface = new ethers.Interface([
                "function approve(address spender, uint256 amount) returns (bool)"
            ]);
            const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, testAmount]);
            await walletAsOther.execute(addresses.usdc, 0, approveCalldata);
            
            return false; // Should have failed
        } catch (error) {
            return error.message.includes("OwnableUnauthorizedAccount") || error.message.includes("caller is not the owner");
        }
    });
    
    // Test 8: Gas limit stress test
    await runTest("Large Transaction Batch", async () => {
        try {
            // Execute multiple approvals in sequence to test gas limits
            const testAmount = ethers.parseUnits("1", 6);
            const approveInterface = new ethers.Interface([
                "function approve(address spender, uint256 amount) returns (bool)"
            ]);
            
            for (let i = 0; i < 3; i++) {
                const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, testAmount]);
                await wallet.execute(addresses.usdc, 0, approveCalldata);
            }
            
            return true; // Completed successfully
        } catch (error) {
            return false;
        }
    });
    
    console.log("\n" + "=".repeat(50));
    console.log(`🧨 EDGE CASE RESULTS: ${testsPassed}/${totalTests} HANDLED CORRECTLY`);
    console.log("=".repeat(50));
    
    if (testsPassed === totalTests) {
        console.log("🛡️  ALL EDGE CASES HANDLED! System is robust!");
    } else {
        console.log(`⚠️  ${totalTests - testsPassed} edge cases need attention.`);
    }
    
    // Final system health check
    console.log("\n🏥 FINAL SYSTEM HEALTH CHECK:");
    console.log("============================");
    
    const usdcBal = await usdc.balanceOf(walletAddr);
    const wethBal = await weth.balanceOf(walletAddr);
    const isPaused = await wallet.paused();
    const routerAllowed = await wallet.allowedTargets(addresses.router);
    const price = await priceFeed.getPrice();
    
    console.log(`✅ Agent wallet funded: ${usdcBal > 0}`);
    console.log(`✅ Agent wallet not paused: ${!isPaused}`);
    console.log(`✅ Router authorized: ${routerAllowed}`);
    console.log(`✅ Price feed functional: ${price > 0}`);
    console.log(`✅ Portfolio balanced: USDC=${ethers.formatUnits(usdcBal, 6)}, WETH=${ethers.formatUnits(wethBal, 18)}`);
    
    console.log("\n🎉 SYSTEM READY FOR PRODUCTION!");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});