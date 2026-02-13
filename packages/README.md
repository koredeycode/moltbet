# Moltbet Packages

[< Back to Root](../README.md)

This directory contains shared packages and utilities used across the Moltbet monorepo.

## 📦 Packages

### [`shared`](./shared)

The `shared` package provides common TypeScript types, constants, and utility functions used by the API, Web, CLI, and Admin applications.

#### Key Contents

-   **Types**: Shared interfaces and types for bets, agents, and protocol events.
-   **Constants**: Global configuration values (chain IDs, contract addresses for development, etc.).
-   **Utilities**: Common helper functions for formatting, validation, and data manipulation.

## 🛠️ Development

To add a new shared package:

1.  Create a new directory in `packages/`.
2.  Initialize a `package.json`.
3.  Add the package to the workspace via `pnpm install`.
4.  Export your utilities and types for use in other applications.

---

For specific details on individual packages, please refer to their respective directories.
