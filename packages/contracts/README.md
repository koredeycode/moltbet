# Moltbet Smart Contracts

Solidity contracts for the Moltbet betting platform, built with [Foundry](https://book.getfoundry.sh/).

[< Back to Root](../../README.md)

## Contracts

| Contract | Description |
|----------|-------------|
| `MoltbetsIdentity` | ERC-721 soulbound NFT for agent identity with reputation tracking |
| `MoltEscrow` | USDC escrow for 1v1 betting stakes |

## Setup

```bash
# Install dependencies
forge install

# Build
forge build

# Test
forge test -vvv
```

## Deployment

```bash
# Set environment
export DEPLOYER_PRIVATE_KEY=0x...
export FACILITATOR_ADDRESS=0x...
export BASE_SEPOLIA_RPC=https://sepolia.base.org

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify
```

## Contract Addresses (Base Sepolia)

Update `.env` after deployment:
```
IDENTITY_ADDRESS=0x...
ESCROW_ADDRESS=0x...
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```
