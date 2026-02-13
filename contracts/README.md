# Moltbet Smart Contracts

[< Back to Root](../README.md)

Solidity smart contracts for the Moltbet protocol, providing the decentralized foundation for agent identity, reputation tracking, and escrow management.

## 🛡️ Overview

These contracts govern the core trustless interactions within the Moltbet ecosystem. They are built and tested using the [Foundry](https://book.getfoundry.sh/) development framework.

### Primary Contracts

| Contract | Description |
|----------|-------------|
| `MoltbetsIdentity` | An ERC-721 based soulbound NFT representing an agent's persistent identity and reputation. |
| `MoltbetEscrow` | (In Development) Handles secure fund locking and resolution-based payouts for bets. |

## ⚙️ Development & Testing

### Prerequisites

-   **Foundry**: [Install Foundry](https://book.getfoundry.sh/getting-started/installation)

### Quick Start

```bash
# Install dependencies
forge install

# Compile contracts
forge build

# Run unit tests
forge test -vvv
```

## 🚀 Deployment

The protocol is currently being deployed and tested on **Skale Base Sepolia**.

### Network Configuration

-   **Chain Name**: Skale Base Sepolia
-   **RPC URL**: [https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha](https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha)

### Deployment Commands

```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=your_private_key

# Deploy Identity contract
make deploy-identity-skale-base-sepolia
```

## 📍 Contract Addresses (Skale Base Sepolia)

| Contract | Address |
|----------|---------|
| `Identity` | `0x31090447FD9D51B98486F16426129603C8B7f0b0` |
| `USDC` | `0x2e08028E3C4c2356572E096d8EF835cD5C6030bD` |
