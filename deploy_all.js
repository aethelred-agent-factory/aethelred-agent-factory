

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
const AETHELRED_DIR = join(ROOT_DIR, 'aethelred');
const AGENT_FACTORY_DIR = join(ROOT_DIR, 'agent-factory-mvp');

const ANVIL_RPC_URL = 'http://127.0.0.1:8545';
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function runCommand(command, cwd) {
  console.log(`\nRunning command: ${command} in ${cwd}`);
  execSync(command, { stdio: 'inherit', cwd });
}

function configureHardhat() {
    console.log('\nConfiguring Hardhat for Anvil...');
    const hardhatConfig = `
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.18",
  networks: {
    anvil: {
      url: "${ANVIL_RPC_URL}",
      accounts: ["${ANVIL_PRIVATE_KEY}"]
    }
  }
};
`;
    writeFileSync(join(AGENT_FACTORY_DIR, 'hardhat.config.cjs'), hardhatConfig);
    console.log('Hardhat configured to use Anvil network.');
}


async function main() {
  try {
    // 1. Start Anvil
    console.log('Starting Anvil container...');
    runCommand('docker-compose up -d anvil', AETHELRED_DIR);
    // Wait for anvil to start
    await new Promise(resolve => setTimeout(resolve, 5000));


    // 2. Deploy Aethelred contracts
    console.log('\nDeploying Aethelred contracts...');
    runCommand('make deploy-local', AETHELRED_DIR);

    // 3. Configure Hardhat for Anvil
    configureHardhat();

    // 4. Deploy Agent Factory contracts
    console.log('\nDeploying Agent Factory contracts...');
    runCommand(`npx hardhat run scripts/deploy_and_write.js --network anvil`, AGENT_FACTORY_DIR);

    // 5. Consolidate deployed addresses
    console.log('\nConsolidating deployed contract addresses...');
    const aethelredAddressesPath = join(AETHELRED_DIR, 'deployment.json');
    const agentFactoryAddressesPath = join(AGENT_FACTORY_DIR, 'deployed_addresses.json');

    if (!existsSync(aethelredAddressesPath) || !existsSync(agentFactoryAddressesPath)) {
        throw new Error('Deployment address files not found!');
    }

    const aethelredAddresses = JSON.parse(readFileSync(aethelredAddressesPath));
    const agentFactoryAddresses = JSON.parse(readFileSync(agentFactoryAddressesPath));

    const combinedAddresses = {
      aethelred: aethelredAddresses.contracts,
      agent_factory: agentFactoryAddresses
    };

    writeFileSync(join(ROOT_DIR, 'deployed_contracts.json'), JSON.stringify(combinedAddresses, null, 2));
    console.log('✅ Combined deployment addresses written to deployed_contracts.json');

    console.log('\n🎉 Unified deployment complete!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();

