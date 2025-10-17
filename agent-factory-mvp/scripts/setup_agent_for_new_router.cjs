const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 SETTING UP AGENT FOR NEW ROUTER");
    
    const [deployer] = await ethers.getSigners();
    const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
    
    // Get contracts
    const factory = await ethers.getContractAt("AgentFactory", addresses.factory);
    const wallet = await ethers.getContractAt("AgentWallet", await factory.walletOf(0));
    
    console.log(`Setting router ${addresses.router} as allowed target...`);
    
    // Set new router as allowed target
    const tx = await wallet.setAllowedTarget(addresses.router, true);
    await tx.wait();
    
    console.log("✅ New router set as allowed target!");
    
    // Verify
    const isAllowed = await wallet.allowedTargets(addresses.router);
    console.log(`Router allowed: ${isAllowed}`);
    
    // Test swap
    console.log("\n🧪 Testing agent wallet swap...");
    const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
    const weth = await ethers.getContractAt("MockERC20", addresses.weth);
    
    const testAmount = ethers.parseUnits("100", 6);
    
    // Check current balances
    const usdcBefore = await usdc.balanceOf(await wallet.getAddress());
    const wethBefore = await weth.balanceOf(await wallet.getAddress());
    console.log(`   Before: ${ethers.formatUnits(usdcBefore, 6)} USDC, ${ethers.formatUnits(wethBefore, 18)} WETH`);
    
    try {
        // Approve router
        const approveInterface = new ethers.Interface([
            "function approve(address spender, uint256 amount) returns (bool)"
        ]);
        const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, testAmount]);
        await wallet.execute(addresses.usdc, 0, approveCalldata);
        
        // Execute swap
        const routerInterface = new ethers.Interface([
            "function swapAForB(address from, address to, uint256 amountIn) returns (uint256)"
        ]);
        const swapCalldata = routerInterface.encodeFunctionData("swapAForB", [
            await wallet.getAddress(), 
            await wallet.getAddress(), 
            testAmount
        ]);
        
        const swapTx = await wallet.execute(addresses.router, 0, swapCalldata);
        await swapTx.wait();
        
        // Check new balances
        const usdcAfter = await usdc.balanceOf(await wallet.getAddress());
        const wethAfter = await weth.balanceOf(await wallet.getAddress());
        console.log(`   After:  ${ethers.formatUnits(usdcAfter, 6)} USDC, ${ethers.formatUnits(wethAfter, 18)} WETH`);
        
        const wethGained = wethAfter - wethBefore;
        const usdcLost = usdcBefore - usdcAfter;
        console.log(`   Result: Lost ${ethers.formatUnits(usdcLost, 6)} USDC, gained ${ethers.formatUnits(wethGained, 18)} WETH`);
        
        console.log("🎉 AGENT WALLET SWAP SUCCESSFUL!");
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});