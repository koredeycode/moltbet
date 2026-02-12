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
export SKALE_RPC=https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha

# Deploy to Skale Base Sepolia
make deploy-identity-skale-base-sepolia
```

## Contract Addresses (Skale Base Sepolia)

Update `.env` after deployment:
```
IDENTITY_ADDRESS=0x31090447FD9D51B98486F16426129603C8B7f0b0
ESCROW_ADDRESS=0x...
USDC_ADDRESS=0x2e08028E3C4c2356572E096d8EF835cD5C6030bD
```
