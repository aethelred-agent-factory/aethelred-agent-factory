 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.18;

 import "@openzeppelin/contracts/access/Ownable.sol";
 import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

 /// @notice Minimal agent wallet that can be instructed by the owner (factory or NFT holder)
 /// to execute arbitrary calls, but enforces a pause flag.
 contract AgentWallet is Ownable {
     bool public paused;
     mapping(address => bool) public allowedTargets;

     event Executed(address indexed target, uint256 value, bytes data);
     event Paused(bool on);

     constructor() {
         paused = false;
     }

     // Initializable pattern fix: use Ownable's initial owner as a check
     function initialize(address newOwner) external {
         // Prevent re-initialization: only allow call if current owner is unassigned (0 address)
         // AgentFactory uses Clones.clone which means 'owner()' will return 0 during first call.
         require(owner() == address(0), "already initialized");
         _transferOwnership(newOwner);
     }

     function setAllowedTarget(address target, bool allowed) external onlyOwner {
         allowedTargets[target] = allowed;
     }
     
     // Batch function to set multiple targets at once (gas optimization)
     function setAllowedTargets(address[] calldata targets, bool[] calldata allowed) external onlyOwner {
         require(targets.length == allowed.length, "AgentWallet: array length mismatch");
         for (uint256 i = 0; i < targets.length;) {
             allowedTargets[targets[i]] = allowed[i];
             unchecked { ++i; }
         }
     }

     function setPaused(bool on) external onlyOwner {
         paused = on;
         emit Paused(on);
     }

     /// @notice execute a low-level call through wallet; limited for ERC20 transfers / router calls
     function execute(address target, uint256 value, bytes calldata data) external onlyOwner returns (bytes memory) {
         require(!paused, "AgentWallet: paused");
         require(allowedTargets[target], "AgentWallet: target not allowed");

         (bool success, bytes memory result) = target.call{value: value}(data);
         require(success, "AgentWallet: target call failed");

         emit Executed(target, value, data);
         return result;
     }

     // allow contract to receive ETH
     receive() external payable {}
 }
