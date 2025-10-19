// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AgentWallet.sol";

contract AgentFactory is ERC721, Ownable {
    uint256 private _nextTokenId = 1; // Start from 1, saves gas vs Counters
    address public immutable walletImplementation;
    uint256 public mintFeeWei;

     // Use private mapping with public getter for better encapsulation (solidity best practice)
     mapping(uint256 => address) private _agentWallet;

     event AgentMinted(uint256 indexed id, address owner, address wallet);
     event MintFeeUpdated(uint256 newFee);

     constructor(address _walletImplementation, uint256 _mintFeeWei) ERC721("AgentNFT", "AGENT") {
         walletImplementation = _walletImplementation;
         mintFeeWei = _mintFeeWei;
     }

     function setMintFee(uint256 f) external onlyOwner {
         mintFeeWei = f;
         emit MintFeeUpdated(f);
     }

     function createAgent() external payable returns (uint256) {
         require(msg.value >= mintFeeWei, "AgentFactory: insufficient fee");

         uint256 id = _nextTokenId;
         unchecked {
             _nextTokenId++;
         }
         
         _mint(msg.sender, id); // Use _mint instead of _safeMint for gas savings

         address clone = Clones.clone(walletImplementation);
         // Initialize the clone with owner = msg.sender
         // Wallet's initialize function now only takes newOwner
         AgentWallet(payable(clone)).initialize(msg.sender);
         
         // Store wallet address
         _agentWallet[id] = clone;

         // Refund excess ETH if any (gas optimization: only if necessary)
         uint256 excess = msg.value - mintFeeWei;
         if (excess > 0) {
             (bool success,) = msg.sender.call{value: excess}("");
             require(success, "AgentFactory: refund failed");
         }

         emit AgentMinted(id, msg.sender, clone);
         return id;
     }

     function walletOf(uint256 id) external view returns (address) {
         // Return the private mapping value
         return _agentWallet[id];
     }

     // withdraw accumulated fees
     function withdraw(address payable to) external onlyOwner {
         (bool success,) = to.call{value: address(this).balance}("");
         require(success, "AgentFactory: ETH transfer failed");
     }
 }
