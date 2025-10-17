import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [signer] = await ethers.getSigners();
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));

  // Check if signer has enough balance before sending transaction (better practice)
  const balance = await ethers.provider.getBalance(signer.address);
  const mintFee = ethers.parseEther("0.01");

  if (balance < mintFee) {
    console.error(`Signer ${signer.address} balance (${ethers.formatEther(balance)} ETH) is less than mint fee (${ethers.formatEther(mintFee)} ETH).`);
    return;
  }

  // Use getContractAt for cleaner contract instance creation
  const factory = await ethers.getContractAt("AgentFactory", addresses.factory, signer);

  console.log("Minting an agent by paying fee...");
  
  // Directly get the transaction response
  const tx = await factory.createAgent({ value: mintFee });
  const rc = await tx.wait();

  // Find the AgentMinted event
  const agentMintedEvent = rc.logs.find(log => {
    try {
      // Decode the log to check the event signature
      return factory.interface.parseLog(log)?.name === "AgentMinted";
    } catch (e) {
      return false;
    }
  });

  if (agentMintedEvent) {
    const parsed = factory.interface.parseLog(agentMintedEvent);
    const id = parsed.args[0].toString();
    const wallet = await factory.walletOf(id);
    
    console.log("Minted agent ID:", id);
    console.log("Agent wallet address:", wallet);
  } else {
    console.log("Mint transaction successful, but could not find AgentMinted event.");
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
