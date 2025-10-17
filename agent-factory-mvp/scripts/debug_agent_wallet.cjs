const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 AGENT WALLET DEBUG");
    
    const [deployer] = await ethers.getSigners();
    const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
    
    // Get contracts
    const factory = await ethers.getContractAt("AgentFactory", addresses.factory);
    const wallet = await ethers.getContractAt("AgentWallet", await factory.walletOf(0));
    const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
    const router = await ethers.getContractAt("MockRouter", addresses.router);
    
    console.log("📋 Wallet Configuration:");
    console.log(`   Wallet Address: ${await wallet.getAddress()}`);
    console.log(`   Wallet Owner: ${await wallet.owner()}`);
    console.log(`   Deployer Address: ${await deployer.getAddress()}`);
    console.log(`   Is Paused: ${await wallet.paused()}`);
    
    console.log("\n🎯 Allowed Targets:");
    console.log(`   Router (${addresses.router}): ${await wallet.allowedTargets(addresses.router)}`);
    console.log(`   USDC (${addresses.usdc}): ${await wallet.allowedTargets(addresses.usdc)}`);
    
    console.log("\n💰 Balances:");
    const usdcBalance = await usdc.balanceOf(await wallet.getAddress());
    console.log(`   Wallet USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
    console.log(`   Deployer USDC: ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
    
    console.log("\n🔧 Router Configuration:");
    const routerUsdcBal = await usdc.balanceOf(addresses.router);
    console.log(`   Router USDC: ${ethers.formatUnits(routerUsdcBal, 6)}`);
    console.log(`   Router Rate: ${await router.rate()}`);
    
    // Test a small approval
    console.log("\n🧪 Testing USDC Approval...");
    try {
        const approveInterface = new ethers.Interface([
            "function approve(address spender, uint256 amount) returns (bool)"
        ]);
        const testAmount = ethers.parseUnits("100", 6);
        const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, testAmount]);
        
        console.log(`   Attempting to approve ${ethers.formatUnits(testAmount, 6)} USDC...`);
        const approveTx = await wallet.execute(addresses.usdc, 0, approveCalldata);
        await approveTx.wait();
        
        const allowance = await usdc.allowance(await wallet.getAddress(), addresses.router);
        console.log(`   ✅ Approval successful! Allowance: ${ethers.formatUnits(allowance, 6)}`);
        
        // Test a swap
        console.log("\n🔄 Testing Swap...");
        const routerInterface = new ethers.Interface([
            "function swapAForB(address recipient, address caller, uint256 amountA) returns (uint256)"
        ]);
        const swapCalldata = routerInterface.encodeFunctionData("swapAForB", [
            await wallet.getAddress(), 
            deployer.address, 
            testAmount
        ]);
        
        console.log(`   Attempting to swap ${ethers.formatUnits(testAmount, 6)} USDC...`);
        const swapTx = await wallet.execute(addresses.router, 0, swapCalldata);
        await swapTx.wait();
        console.log(`   ✅ Swap successful! TX: ${swapTx.hash}`);
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log(`   Reason: ${error.reason || 'Unknown'}`);
        
        // Additional debugging
        if (error.message.includes("target call failed")) {
            console.log("\n🔍 Investigating target call failure...");
            
            // Check if targets are allowed
            const routerAllowed = await wallet.allowedTargets(addresses.router);
            const usdcAllowed = await wallet.allowedTargets(addresses.usdc);
            console.log(`   Router allowed: ${routerAllowed}`);
            console.log(`   USDC allowed: ${usdcAllowed}`);
            
            // Check if wallet is paused
            const isPaused = await wallet.paused();
            console.log(`   Wallet paused: ${isPaused}`);
            
            // Check ownership
            const owner = await wallet.owner();
            console.log(`   Wallet owner: ${owner}`);
            console.log(`   Deployer: ${deployer.address}`);
            console.log(`   Owner matches: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});