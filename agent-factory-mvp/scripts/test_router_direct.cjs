const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 TESTING ROUTER DIRECTLY");
    
    const [deployer] = await ethers.getSigners();
    const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
    
    // Get contracts
    const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
    const weth = await ethers.getContractAt("MockERC20", addresses.weth);
    const router = await ethers.getContractAt("MockRouterFixed", addresses.router);
    
    console.log("📋 Initial State:");
    console.log(`   Deployer USDC: ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
    console.log(`   Deployer WETH: ${ethers.formatUnits(await weth.balanceOf(deployer.address), 18)}`);
    console.log(`   Router USDC: ${ethers.formatUnits(await usdc.balanceOf(addresses.router), 6)}`);
    console.log(`   Router WETH: ${ethers.formatUnits(await weth.balanceOf(addresses.router), 18)}`);
    console.log(`   Router Rate: ${await router.rate()}`);
    
    // Test swap directly from deployer
    const testAmount = ethers.parseUnits("100", 6);
    console.log(`\n🧪 Testing direct swap of ${ethers.formatUnits(testAmount, 6)} USDC...`);
    
    try {
        // Approve router to spend deployer's USDC
        console.log("   Approving USDC...");
        await usdc.approve(addresses.router, testAmount);
        
        // Execute swap
        console.log("   Executing swap...");
        const tx = await router.swapAForB(deployer.address, deployer.address, testAmount);
        await tx.wait();
        
        console.log("   ✅ Swap successful!");
        console.log(`   New USDC: ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
        console.log(`   New WETH: ${ethers.formatUnits(await weth.balanceOf(deployer.address), 18)}`);
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log(`   Reason: ${error.reason || 'Unknown'}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});