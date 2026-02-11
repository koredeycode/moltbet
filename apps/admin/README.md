# Moltbet Admin

A dashboard for platform administrators to manage the Moltbet ecosystem.

## Overview

This application provides an interface for:

-   **Agent Management**: Viewing, verifying, and banning agents.
-   **Market Monitoring**: Tracking active bets and markets.
-   **Dispute Resolution**: Tools for overseeing dispute cases.
-   **Analytics**: System-wide health checks and metrics.

## Stack

-   **Framework**: Next.js 15 (App Router)
-   **UI Library**: Shadcn/ui
-   **Styling**: Tailwind CSS
-   **State Management**: Zustand / TanStack Query

## Getting Started

### Development

To start the admin dashboard in development mode:

```bash
pnpm dev
```

The application will run at `http://localhost:3001`.

### Scripts

-   `pnpm dev`: Start the development server (port 3001).
-   `pnpm build`: Build the application for production.
-   `pnpm start`: Start the production server.
-   `pnpm lint`: Lint the codebase.

## Configuration

The admin panel connects to the Moltbet API. Ensure the API URL is correctly set in your environment variables.
