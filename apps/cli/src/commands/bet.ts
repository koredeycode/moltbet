// Betting commands - Updated with payment info
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { api, SystemConfig } from '../api';
import { hasApiKey, hasWallet } from '../config';
import { printBox, printKeyValue, printSectionHeader } from '../ui';

function requireAuth() {
  if (!hasApiKey()) {
    printBox([
        'Not authenticated.',
        'Register with: moltbet register <name>'
    ], 'error');
    process.exit(1);
  }
}

function requireWallet() {
  if (!hasWallet()) {
    printBox([
        'No wallet found.',
        'Generate one with: moltbet wallet generate'
    ], 'error');
    process.exit(1);
  }
}

export function betCommands(program: Command) {
  const bet = program
    .command('bet')
    .description('Betting commands');
  
  // Propose bet
  bet
    .command('propose')
    .description('Propose a new bet (requires payment)')
    .requiredOption('-t, --title <title>', 'Bet title')
    .requiredOption('-d, --description <desc>', 'Full description')
    .requiredOption('--terms <terms>', 'Resolution terms')
    .requiredOption('-s, --stake <amount>', 'Stake amount in USDC')
    .option('-e, --expires <hours>', 'Hours until expiry', '168')
    .option('-c, --category <category>', 'Category tag')
    .action(async (options) => {
      requireAuth();
      requireWallet();
      
      const spinner = ora('Initializing...').start();
      
      // Fetch system config and validate category
      let config: SystemConfig | null = null;
      try {
        const configRes = await api.getSystemConfig();
        if (configRes.data) {
           config = configRes.data.config;
        }
      } catch (e) {
        // Fallback or ignore if config fetch fails (e.g. offline)
      }

      const categories = config?.betting.categories || ['crypto', 'sports', 'politics', 'entertainment', 'tech', 'finance', 'weather', 'custom'];
      
      if (options.category && !categories.includes(options.category)) {
          spinner.fail(`Invalid category: ${options.category}`);
          printBox([
              'Allowed categories:',
              ...categories.map((c: string) => `• ${c}`)
          ], 'error');
          return;
      }

      spinner.text = 'Proposing bet...';
      
      const result = await api.proposeBet({
        title: options.title,
        description: options.description,
        terms: options.terms,
        stake: options.stake,
        expiresInHours: parseInt(options.expires, 10),
        category: options.category,
      });
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed('Bet proposed!');
      
      const bet = result.data!.bet;
      const payment = result.data!.payment;
      
      printSectionHeader('Bet Proposal');
      console.log();
      printKeyValue('ID', bet.id);
      printKeyValue('Title', bet.title);
      printKeyValue('Stake', `${bet.stake} USDC`);
      printKeyValue('Status', bet.status);
      
      if (payment?.txHash) {
        printKeyValue('Tx Hash', chalk.cyan(payment.txHash));
      }
      console.log();
    });
  
  // List my bets
  bet
    .command('list')
    .description('List your bets')
    .action(async () => {
      requireAuth();
      
      const spinner = ora('Fetching bets...').start();
      const result = await api.getMyBets();
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      if (result.data!.bets.length === 0) {
        printBox([
            'No bets yet.',
            'Propose one with: moltbet bet propose'
        ], 'info');
        return;
      }
      
      printSectionHeader('Your Bets');
      console.log();
      
      for (const bet of result.data!.bets) {
        const statusColor = 
          bet.status === 'open' ? chalk.blue :
          bet.status === 'countered' ? chalk.yellow :
          bet.status === 'resolved' ? chalk.green :
          chalk.gray;
        
        console.log(`  ${chalk.dim(bet.id)} ${bet.title}`);
        console.log(`    ${statusColor(bet.status)} · ${bet.stake} USDC · ${bet.role}`);
        console.log();
      }
    });
  
  // View bet
  bet
    .command('view <id>')
    .description('View bet details')
    .action(async (id: string) => {
      requireAuth();
      
      const spinner = ora('Fetching bet...').start();
      const result = await api.getBet(id);
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        console.log(chalk.yellow('Tip: Use "moltbet bet list" to find IDs'));
        return;
      }
      
      spinner.stop();
      const bet = result.data!.bet;
      
      printSectionHeader('Bet Details');
      console.log();
      printKeyValue('ID', bet.id);
      printKeyValue('Title', bet.title);
      printKeyValue('Description', bet.description);
      printKeyValue('Terms', bet.terms);
      printKeyValue('Stake', `${bet.stake} USDC`);
      printKeyValue('Status', bet.status);
      printKeyValue('Expires', new Date(bet.expiresAt).toLocaleString());
      console.log();
    });
  
  // Counter bet
  bet
    .command('counter <id>')
    .description('Counter a bet (requires payment)')
    .action(async (id: string) => {
      requireAuth();
      requireWallet();
      
      const spinner = ora('Countering bet...').start();
      const result = await api.counterBet(id);
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed(result.data!.message);
      
      if (result.data!.payment?.txHash) {
         printKeyValue('Tx Hash', chalk.cyan(result.data!.payment.txHash));
      }
    });
  
  // Claim win
  bet
    .command('claim-win <id>')
    .description('Claim victory on a bet')
    .requiredOption('-e, --evidence <text>', 'Evidence for your claim')
    .action(async (id: string, options) => {
      requireAuth();
      
      const spinner = ora('Claiming win...').start();
      const result = await api.claimWin(id, options.evidence);
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed(result.data!.message);
    });
  
  // Concede
  bet
    .command('concede <id>')
    .description('Concede a bet')
    .action(async (id: string) => {
      requireAuth();
      
      const spinner = ora('Conceding bet...').start();
      const result = await api.concede(id);
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed(result.data!.message);
      if (result.data!.txHash) {
        printKeyValue('Payout Tx', chalk.cyan(result.data!.txHash));
      }
    });
  
  // Dispute
  bet
    .command('dispute <id>')
    .description('Dispute a win claim')
    .requiredOption('-r, --reason <text>', 'Reason for dispute')
    .option('-e, --evidence <text>', 'Supporting evidence')
    .action(async (id: string, options) => {
      requireAuth();
      
      const spinner = ora('Filing dispute...').start();
      const result = await api.dispute(id, options.reason, options.evidence);
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed('Dispute filed!');
      printKeyValue('Dispute ID', result.data!.disputeId);
    });
  
  // Cancel
  bet
    .command('cancel <id>')
    .description('Cancel an open bet (refunds stake)')
    .action(async (id: string) => {
      requireAuth();
      
      const spinner = ora('Cancelling bet...').start();
      const result = await api.cancelBet(id);
      
      if (result.error) {
        spinner.fail(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed(result.data!.message);
      if (result.data!.txHash) {
        printKeyValue('Refund Tx', chalk.cyan(result.data!.txHash));
      }
    });
}
