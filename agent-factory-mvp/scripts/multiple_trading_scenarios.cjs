const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 MULTIPLE TRADING SCENARIOS TEST");
    console.log("=================================");
    
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
    
    async function getPortfolioStatus() {
        const usdcBal = await usdc.balanceOf(walletAddr);
        const wethBal = await weth.balanceOf(walletAddr);
        const price = await priceFeed.getPrice();
        
        const usdcValue = parseFloat(ethers.formatUnits(usdcBal, 6));
        const wethValue = parseFloat(ethers.formatUnits(wethBal, 18));
        const priceUSD = parseFloat(ethers.formatUnits(price, 18));
        const portfolioValue = usdcValue + (wethValue * priceUSD);
        
        return {
            usdc: usdcValue,
            weth: wethValue,
            price: priceUSD,
            portfolio: portfolioValue
        };
    }
    
    async function executeSwap(amount, fromToken) {
        if (fromToken === 'USDC') {
            const testAmount = ethers.parseUnits(amount.toString(), 6);
            
            // Approve USDC
            const approveInterface = new ethers.Interface([
                "function approve(address spender, uint256 amount) returns (bool)"
            ]);
            const approveCalldata = approveInterface.encodeFunctionData("approve", [addresses.router, testAmount]);
            await wallet.execute(addresses.usdc, 0, approveCalldata);
            
            // Swap USDC for WETH
            const routerInterface = new ethers.Interface([
                "function swapAForB(address from, address to, uint256 amountIn) returns (uint256)"
            ]);
            const swapCalldata = routerInterface.encodeFunctionData("swapAForB", [
                walletAddr, walletAddr, testAmount
            ]);
            await wallet.execute(addresses.router, 0, swapCalldata);
            
        } else {
            // For WETH to USDC swaps, we'd need a reverse function
            console.log("   Note: Reverse swaps (WETH→USDC) not implemented in this demo");
        }
    }
    
    console.log("📊 Initial Portfolio Status:");
    let status = await getPortfolioStatus();
    console.log(`   USDC: ${status.usdc.toFixed(2)} | WETH: ${status.weth.toFixed(6)} | Price: $${status.price} | Portfolio: $${status.portfolio.toFixed(2)}`);
    
    // Scenario 1: Price drops below threshold - Agent should hold
    console.log("\n🎯 Scenario 1: Price drops to $2000 (below threshold)");
    await priceFeed.setPrice(ethers.parseUnits("2000", 18));
    status = await getPortfolioStatus();
    console.log(`   New Price: $${status.price} | Portfolio: $${status.portfolio.toFixed(2)}`);
    console.log(`   Expected Action: HOLD (price ≤ $2100)`);
    
    // Scenario 2: Price rises above threshold - Agent should swap
    console.log("\n🎯 Scenario 2: Price rises to $2500 (above threshold)");
    await priceFeed.setPrice(ethers.parseUnits("2500", 18));
    status = await getPortfolioStatus();
    console.log(`   New Price: $${status.price} | Portfolio: $${status.portfolio.toFixed(2)}`);
    console.log(`   Expected Action: SWAP (price > $2100)`);
    console.log(`   Executing 200 USDC → WETH swap...`);
    await executeSwap(200, 'USDC');
    
    status = await getPortfolioStatus();
    console.log(`   After swap: USDC: ${status.usdc.toFixed(2)} | WETH: ${status.weth.toFixed(6)} | Portfolio: $${status.portfolio.toFixed(2)}`);
    
    // Scenario 3: Extreme price volatility
    console.log("\n🎯 Scenario 3: Extreme price volatility");
    const prices = [1500, 3000, 1800, 2800, 2200];
    
    for (let i = 0; i < prices.length; i++) {
        await priceFeed.setPrice(ethers.parseUnits(prices[i].toString(), 18));
        status = await getPortfolioStatus();
        const action = status.price > 2100 ? "SWAP" : "HOLD";
        console.log(`   Price ${i+1}: $${status.price} → ${action} | Portfolio: $${status.portfolio.toFixed(2)}`);
        
        if (status.price > 2100 && status.usdc >= 50) {
            console.log(`     Executing 50 USDC → WETH swap...`);
            await executeSwap(50, 'USDC');
            status = await getPortfolioStatus();
            console.log(`     New balance: ${status.usdc.toFixed(2)} USDC, ${status.weth.toFixed(6)} WETH`);
        }
    }
    
    // Scenario 4: Multiple small swaps
    console.log("\n🎯 Scenario 4: Multiple small swaps at favorable price");
    await priceFeed.setPrice(ethers.parseUnits("2300", 18));
    status = await getPortfolioStatus();
    console.log(`   Price: $${status.price} | Starting Portfolio: $${status.portfolio.toFixed(2)}`);
    
    for (let i = 1; i <= 5; i++) {
        if (status.usdc >= 25) {
            console.log(`   Small swap ${i}: 25 USDC → WETH`);
            await executeSwap(25, 'USDC');
            status = await getPortfolioStatus();
            console.log(`     Balance: ${status.usdc.toFixed(2)} USDC, ${status.weth.toFixed(6)} WETH`);
        }
    }
    
    // Final portfolio assessment
    console.log("\n📊 FINAL PORTFOLIO ASSESSMENT:");
    console.log("============================");
    status = await getPortfolioStatus();
    console.log(`💰 Final USDC: ${status.usdc.toFixed(2)}`);
    console.log(`💰 Final WETH: ${status.weth.toFixed(6)}`);
    console.log(`📈 Final Price: $${status.price}`);
    console.log(`💎 Final Portfolio Value: $${status.portfolio.toFixed(2)}`);
    
    const initialValue = 10000; // Started with $10,000
    const pnl = status.portfolio - initialValue;
    const pnlPercent = (pnl / initialValue) * 100;
    
    console.log(`📈 P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`);
    
    if (Math.abs(pnl) < 50) {
        console.log("✅ Portfolio value maintained within acceptable range!");
    } else if (pnl > 0) {
        console.log("🎉 Portfolio gained value through trading!");
    } else {
        console.log("⚠️  Portfolio lost value - review trading strategy");
    }
    
    // Reset price to normal
    await priceFeed.setPrice(ethers.parseUnits("2200", 18));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});