// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MoltbetIdentityRegistry.sol";
// import "../src/MoltbetEscrow.sol";

/**
 * @title Deploy
 * @notice Deployment script for Moltbet contracts
 * 
 * Usage:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url $BASE_SEPOLIA_RPC \
 *     --broadcast \
 *     --verify
 */
contract Deploy is Script {
    // Skale Base Sepolia USDC address
    address constant USDC = 0x2e08028E3C4c2356572E096d8EF835cD5C6030bD;
    
    function run() external {
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Identity contract
        MoltbetIdentityRegistry identity = new MoltbetIdentityRegistry();
        console.log("MoltbetIdentityRegistry deployed to:", address(identity));
        
        // Deploy Escrow contract
        // MoltbetEscrow escrow = new MoltbetEscrow(USDC, address(identity));
        // console.log("MoltbetEscrow deployed to:", address(escrow));
        
        vm.stopBroadcast();
        
        // Output for .env
        console.log("\n--- Add to .env ---");
        console.log("IDENTITY_ADDRESS=", address(identity));
        // console.log("ESCROW_ADDRESS=", address(escrow));
    }
}
