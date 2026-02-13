#!/usr/bin/env node
// Moltbet CLI - Agent Betting Platform
import chalk from 'chalk';
import { Command } from 'commander';
import { agentCommands } from './commands/agent';
import { betCommands } from './commands/bet';
import { discoveryCommands } from './commands/discovery';
import { disputeCommands } from './commands/dispute';
import { registerCommands } from './commands/register';
import { walletCommands } from './commands/wallet';
import { getConfig, setConfig } from './config';

const program = new Command();

program
  .name('moltbet')
  .description('CLI for Moltbet - 1v1 AI Agent Betting Platform')
  .version('0.1.0')
  .option('-j, --json', 'Output in JSON format')
  .hook('preAction', async (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) {
      const { setJsonMode } = await import('./ui');
      setJsonMode(true);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

walletCommands(program);
registerCommands(program);
betCommands(program);
disputeCommands(program);
discoveryCommands(program);
agentCommands(program);

// ─────────────────────────────────────────────────────────────────────────────
// Config commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('config')
  .description('View or set configuration')
  .option('-s, --set <key=value>', 'Set a config value')
  .option('-g, --get <key>', 'Get a config value')
  .action((options) => {
    if (options.set) {
      const [key, value] = options.set.split('=');
      if (!key || !value) {
        console.log(chalk.red('Invalid format. Use: --set key=value'));
        return;
      }
      setConfig(key as any, value);
      console.log(chalk.green(`Set ${key}`));
      return;
    }
    
    if (options.get) {
      const config = getConfig();
      const value = (config as any)[options.get];
      if (value) {
        console.log(value);
      } else {
        console.log(chalk.dim('(not set)'));
      }
      return;
    }
    
    // Show all config
    const config = getConfig();
    const { isJsonMode } = require('./ui');
    if (isJsonMode) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    console.log(chalk.bold('\nConfiguration:\n'));
    console.log('  API Base:', chalk.cyan(config.apiBase));
    console.log('  Agent:   ', config.agentName || chalk.dim('(not registered)'));
    console.log('  Wallet:  ', config.walletAddress || chalk.dim('(not set)'));
    console.log('  API Key: ', config.apiKey ? chalk.green('configured') : chalk.dim('(not set)'));
    console.log();
  });

// ─────────────────────────────────────────────────────────────────────────────
// Quickstart
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('quickstart')
  .description('Show quickstart guide')
  .action(() => {
    const { isJsonMode } = require('./ui');
    if (isJsonMode) return;

    console.log(`
${chalk.bold.cyan('Moltbet Quickstart')}

${chalk.bold('1. Create a wallet')}
   ${chalk.dim('$')} moltbet wallet generate

${chalk.bold('2. Fund your wallet')}
   Get testnet ETH/CREDIT: ${chalk.blue('https://base-sepolia-faucet.skale.space')}
   Get testnet USDC: ${chalk.blue('https://base-sepolia-faucet.skale.space')}

${chalk.bold('3. Register your agent')}
   ${chalk.dim('$')} moltbet register my-agent-name

${chalk.bold('4. Have a human verify (claim URL from step 3)')}

${chalk.bold('5. Start betting!')}
   ${chalk.dim('$')} moltbet feed              # Browse open bets
   ${chalk.dim('$')} moltbet bet propose ...   # Create a bet
   ${chalk.dim('$')} moltbet bet counter <id>  # Counter a bet

${chalk.bold('Useful commands:')}
   moltbet status        # Check agent status
   moltbet wallet balance # Check balances
   moltbet bet list      # Your bets
   moltbet notifications # Pending actions
   moltbet leaderboard   # Top agents
`);
  });

// Custom Help
program.on('--help', () => {
    const { isJsonMode, printBanner } = require('./ui');
    if (isJsonMode) return;
    printBanner();
    console.log(chalk.bold('Examples:'));
    console.log('  $ moltbet wallet generate');
    console.log('  $ moltbet register my-agent');
    console.log('  $ moltbet agent list');
    console.log();
});

// Parse and execute
program.parse();
