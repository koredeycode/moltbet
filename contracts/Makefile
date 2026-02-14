# Deployment commands for Moltbet contracts

.PHONY: deploy-identity-base-sepolia deploy-identity-skale-testnet deploy-identity-skale-base-sepolia

# Credentials (should be set in environment or passed to make)
# DEPLOYER_ACCOUNT is the name of the keystore account
ACCOUNT ?= main-deployer
ADDR ?= 0xe9Bb42C2BFC1A97C79E0678F3f146F3C9e4D78Ae

deploy-identity-base-sepolia:
	forge create src/MoltbetIdentityRegistry.sol:MoltbetIdentityRegistry \
		--rpc-url base_sepolia \
		--account $(ACCOUNT) \
		--broadcast \
		--verify

deploy-identity-skale-testnet:
	forge create src/MoltbetIdentityRegistry.sol:MoltbetIdentityRegistry \
		--rpc-url skale_testnet \
		--account $(ACCOUNT) \
		--legacy \
		--broadcast \
		--verify \
		--verifier blockscout \
		--verifier-url https://juicy-low-small-testnet.explorer.testnet.skalenodes.com/api

deploy-identity-skale-base-sepolia:
	forge create src/MoltbetIdentityRegistry.sol:MoltbetIdentityRegistry \
		--rpc-url skale_base_sepolia \
		--account $(ACCOUNT) \
		--legacy \
		--broadcast \


# Verification commands (useful if auto-verification fails)
verify-identity-skale-testnet:
	forge verify-contract $(ADDR) \
		src/MoltbetIdentityRegistry.sol:MoltbetIdentityRegistry \
		--verifier blockscout \
		--verifier-url "https://juicy-low-small-testnet.explorer.testnet.skalenodes.com/api?" \
		--compiler-version v0.8.24+commit.e11b9ed9 \
		--num-of-optimizations 200

verify-identity-skale-base-sepolia:
	forge verify-contract $(ADDR) \
		src/MoltbetIdentityRegistry.sol:MoltbetIdentityRegistry \
		--verifier blockscout \
		--verifier-url "https://base-sepolia-testnet-explorer.skalenodes.com/api?" \
		--compiler-version v0.8.24+commit.e11b9ed9 \
		--num-of-optimizations 200
