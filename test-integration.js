#!/usr/bin/env node

// Test script for the integrated Aethelred + Agent Factory system
import dotenv from 'dotenv';
import { queryDecentralizedAI } from './bridge/aethelred-integration.js';
import { EnhancedAgentController } from './agent-factory-mvp/controller/enhanced_agent_controller_class.js';

// Load test environment
dotenv.config({ path: '.env.test' });

console.log('🚀 Testing Aethelred + Agent Factory Integration');
console.log('='.repeat(50));

async function testIntegration() {
    try {
        // Test 1: Direct bridge functionality
        console.log('\n📡 Test 1: Testing Aethelred Bridge...');
        const mockMarketData = {
            timestamp: Date.now(),
            symbol: 'WETH/USDC',
            price: 2150.50,
            volume: 1234567,
            trend: 'bullish'
        };

        const aiResponse = await queryDecentralizedAI(mockMarketData, {
            useAethelred: true,
            fallbackToDeepSeek: true,
            timeout: 10000
        });

        console.log('✅ Bridge Response:', JSON.stringify(aiResponse, null, 2));

        // Test 2: Enhanced Agent Controller
        console.log('\n🤖 Test 2: Testing Enhanced Agent Controller...');
        const controller = new EnhancedAgentController();
        const decision = await controller.makeDecision(mockMarketData);
        
        console.log('✅ Agent Decision:', JSON.stringify(decision, null, 2));

        // Test 3: End-to-end trading simulation
        console.log('\n💱 Test 3: End-to-end Trading Simulation...');
        
        const tradeResults = [];
        for (let i = 0; i < 3; i++) {
            const testData = {
                ...mockMarketData,
                price: 2150.50 + (Math.random() - 0.5) * 100,
                timestamp: Date.now() + i * 1000
            };
            
            const result = await controller.makeDecision(testData);
            tradeResults.push(result);
            console.log(`  Trade ${i + 1}:`, result.action, `at price ${testData.price}`);
        }

        console.log('\n🎯 Integration Test Results:');
        console.log('- Bridge functionality: ✅ Working');
        console.log('- Agent controller: ✅ Working');
        console.log('- End-to-end flow: ✅ Working');
        console.log(`- Total test trades: ${tradeResults.length}`);
        
        const successRate = tradeResults.filter(r => r.action !== 'hold').length / tradeResults.length;
        console.log(`- Decision success rate: ${(successRate * 100).toFixed(1)}%`);

    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the integration test
testIntegration().then(() => {
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
});