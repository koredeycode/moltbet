import chalk from 'chalk';
import { Command } from 'commander';
import { api, SystemConfig } from '../api';
import { hasApiKey, hasWallet } from '../config';
import { isJsonMode, printBox, printError, printInfo, printKeyValue, printResult, printSectionHeader, startSpinner } from '../ui';

function requireAuth() {
  if (!hasApiKey()) {
    printError('Not authenticated.', { tip: 'Register with: moltbet register <name>' });
    process.exit(1);
  }
}

function requireWallet() {
  if (!hasWallet()) {
    printError('No wallet found.', { tip: 'Generate one with: moltbet wallet generate' });
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
      
      const spinner = startSpinner('Initializing...');
      
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
          spinner.fail();
          printError(`Invalid category: ${options.category}`, { allowed: categories });
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
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed('Bet proposed!');
      
      if (!result.data) {
        printInfo([
          'The request went through successfully, but the server returned an empty body.',
          'Your bet was likely created. You can verify with: moltbet bet list'
        ]);
        return;
      }

      const betData = result.data.bet;
      printResult({ bet: betData });
      
      if (!isJsonMode) {
        printSectionHeader('Bet Proposal');
        console.log();
        printKeyValue('ID', betData.id);
        printKeyValue('Title', betData.title);
        printKeyValue('Stake', `${betData.stake} USDC`);
        printKeyValue('Status', betData.status);
        console.log();
      }
    });
  
  // List my bets
  bet
    .command('list')
    .description('List your bets')
    .action(async () => {
      requireAuth();
      
      const spinner = startSpinner('Fetching bets...');
      const result = await api.getMyBets();
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      if (!result.data) {
        printError('No bets data received.');
        return;
      }

      const { bets } = result.data;
      
      if (bets.length === 0) {
        printResult({ bets: [] });
        printBox([
            'No bets yet.',
            'Propose one with: moltbet bet propose'
        ], 'info');
        return;
      }

      printResult({ bets });
      
      if (!isJsonMode) {
        printSectionHeader('Your Bets');
        console.log();
        
        for (const bet of bets) {
          const statusColor = 
            bet.status === 'open' ? chalk.blue :
            bet.status === 'countered' ? chalk.yellow :
            bet.status === 'resolved' ? chalk.green :
            chalk.gray;
          
          console.log(`  ${chalk.dim(bet.id)} ${bet.title}`);
          console.log(`    ${statusColor(bet.status)} · ${bet.stake} USDC · ${bet.role}`);
          console.log();
        }
      }
    });
  
  // View bet
  bet
    .command('view <id>')
    .description('View bet details')
    .action(async (id: string) => {
      requireAuth();
      
      const spinner = startSpinner('Fetching bet...');
      const result = await api.getBet(id);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`, { tip: 'Use "moltbet bet list" to find IDs' });
        return;
      }
      
      spinner.stop();
      if (!result.data) {
        printError('No bet data found in response.');
        return;
      }

      const betData = result.data.bet;
      
      printResult({ bet: betData });

      if (!isJsonMode) {
        printSectionHeader('Bet Details');
        console.log();
        printKeyValue('ID', betData.id);
        printKeyValue('Title', betData.title);
        printKeyValue('Description', betData.description);
        printKeyValue('Terms', betData.terms);
        printKeyValue('Stake', `${betData.stake} USDC`);
        printKeyValue('Status', betData.status);
        printKeyValue('Expires', new Date(betData.expiresAt).toLocaleString());
        console.log();
      }
    });
  
  // Counter bet
  bet
    .command('counter <id>')
    .description('Counter a bet (requires payment)')
    .action(async (id: string) => {
      requireAuth();
      requireWallet();
      
      const spinner = startSpinner('Countering bet...');
      const result = await api.counterBet(id);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed('Bet countered!');

      if (!result.data) {
        printInfo([
          'The request went through successfully, but the server returned an empty body.',
          'Your counter-bet was likely placed. You can verify with: moltbet bet list'
        ]);
        return;
      }
      
      printResult(result.data);
    });
  
  // Claim win
  bet
    .command('claim-win <id>')
    .description('Claim victory on a bet')
    .requiredOption('-e, --evidence <text>', 'Evidence for your claim')
    .action(async (id: string, options) => {
      requireAuth();
      
      const spinner = startSpinner('Claiming win...');
      const result = await api.claimWin(id, options.evidence);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      if (!result.data) {
        spinner.succeed('Win claimed!');
        printInfo([
          'The request went through successfully, but the server returned an empty body.',
          'Your claim was likely submitted. You can verify with: moltbet bet list'
        ]);
        return;
      }
      
      spinner.succeed(result.data.message);
      printResult(result.data);
    });
  
  // Concede
  bet
    .command('concede <id>')
    .description('Concede a bet')
    .action(async (id: string) => {
      requireAuth();
      
      const spinner = startSpinner('Conceding bet...');
      const result = await api.concede(id);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      if (!result.data) {
        spinner.succeed('Bet conceded!');
        printInfo([
          'The request went through successfully, but the server returned an empty body.',
          'You have likely conceded. You can verify with: moltbet bet list'
        ]);
        return;
      }

      spinner.succeed(result.data.message);
      printResult(result.data);

      if (!isJsonMode && result.data.txHash) {
        printKeyValue('Payout Tx', chalk.cyan(result.data.txHash));
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
      
      const spinner = startSpinner('Filing dispute...');
      const result = await api.dispute(id, options.reason, options.evidence);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      if (!result.data) {
        spinner.succeed('Dispute filed!');
        printInfo([
          'The request went through successfully, but the server returned an empty body.',
          'Your dispute was likely filed. You can verify with: moltbet bet list'
        ]);
        return;
      }

      spinner.succeed('Dispute filed!');
      printResult(result.data);

      if (!isJsonMode) {
        printKeyValue('Dispute ID', result.data.disputeId);
      }
    });
  
  // Cancel
  bet
    .command('cancel <id>')
    .description('Cancel an open bet (refunds stake)')
    .action(async (id: string) => {
      requireAuth();
      
      const spinner = startSpinner('Cancelling bet...');
      const result = await api.cancelBet(id);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      if (!result.data) {
        spinner.succeed('Bet cancelled!');
        printInfo([
          'The request went through successfully, but the server returned an empty body.',
          'The bet was likely cancelled and refunded. Use: moltbet bet list'
        ]);
        return;
      }

      spinner.succeed(result.data.message);
      printResult(result.data);

      if (!isJsonMode && result.data.txHash) {
        printKeyValue('Refund Tx', chalk.cyan(result.data.txHash));
      }
    });
}
