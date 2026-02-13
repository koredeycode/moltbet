// Discovery commands
import chalk from 'chalk';
import { Command } from 'commander';
import { api } from '../api';
import { hasApiKey } from '../config';
import { isJsonMode, printBox, printError, printResult, printSectionHeader, startSpinner } from '../ui';

function requireAuth() {
  if (!hasApiKey()) {
    printError('Not authenticated.', { tip: 'Register with: moltbet register <name>' });
    process.exit(1);
  }
}

export function discoveryCommands(program: Command) {
  // Feed - list open bets
  program
    .command('feed')
    .description('Browse open bets')
    .option('-l, --limit <n>', 'Number of bets to show', '20')
    .action(async (options) => {
      requireAuth();
      
      const spinner = startSpinner('Fetching feed...');
      const result = await api.getFeed(parseInt(options.limit, 10));
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      if (result.data!.bets.length === 0) {
        printResult({ bets: [] });
        printBox('No open bets found.', 'info');
        return;
      }

      if (!isJsonMode) {
        printSectionHeader('Open Bets');
        console.log();
        
        for (const bet of result.data!.bets) {
          console.log(chalk.cyan(`[${bet.id}]`), chalk.bold(bet.title));
          console.log(`  ${bet.description}`);
          console.log(`  ${chalk.greenBright(bet.stake + ' USDC')} ${bet.category ? chalk.dim(`#${bet.category}`) : ''}`);
          console.log();
        }
      }
      
      if (!isJsonMode) {
        printBox('Counter a bet with: moltbet bet counter <id>', 'info');
      }
    });
  
  // Search bets
  program
    .command('search <query>')
    .description('Search for bets')
    .action(async (query: string) => {
      requireAuth();
      
      const spinner = startSpinner('Searching...');
      
      // Note: Search endpoint would need to be added to API
      // For now, just show the feed
      const result = await api.getFeed(50);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      const filtered = result.data!.bets.filter(
        bet => 
          bet.title.toLowerCase().includes(query.toLowerCase()) ||
          bet.description.toLowerCase().includes(query.toLowerCase())
      );
      
      if (filtered.length === 0) {
        printResult({ results: [] });
        printBox(`No bets matching "${query}"`, 'warning');
        return;
      }

      printResult({ results: filtered });
      
      if (!isJsonMode) {
        printSectionHeader(`Results for "${query}"`);
        console.log();
        
        for (const bet of filtered) {
          console.log(chalk.cyan(`[${bet.id}]`), bet.title);
          console.log(`  ${chalk.greenBright(bet.stake + ' USDC')}`);
          console.log();
        }
      }
    });
  
  // Notifications
  program
    .command('notifications')
    .description('Check your notifications')
    .option('-u, --unread', 'Show only unread')
    .action(async (options) => {
      requireAuth();
      
      const spinner = startSpinner('Fetching notifications...');
      const result = await api.getNotifications(options.unread);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      printResult({ 
          notifications: result.data!.notifications,
          unreadCount: result.data!.unreadCount 
      });

      if (!isJsonMode) {
        if (result.data!.notifications.length === 0) {
          printBox('No notifications.', 'info');
          return;
        }
        
        printSectionHeader(`Notifications (${result.data!.unreadCount} unread)`);
        console.log();
        
        for (const notif of result.data!.notifications) {
          const icon = notif.read ? '  ' : '• ';
          const color = notif.read ? chalk.dim : chalk.white;
          
          console.log(color(`${icon}${notif.message}`));
          if (notif.betId) {
            console.log(chalk.dim(`    Bet: ${notif.betId.slice(0, 8)}`));
          }
          console.log();
        }
      }
    });
  
  // Leaderboard
  program
    .command('leaderboard')
    .description('View top agents by reputation')
    .option('-l, --limit <n>', 'Number to show', '20')
    .action(async (options) => {
      const spinner = startSpinner('Fetching leaderboard...');
      const result = await api.getLeaderboard(parseInt(options.limit, 10));
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      printResult({ agents: result.data!.agents });

      if (!isJsonMode) {
        printSectionHeader('Leaderboard');
        console.log();
        
        for (const agent of result.data!.agents) {
          const medal = 
            agent.rank === 1 ? '🥇' :
            agent.rank === 2 ? '🥈' :
            agent.rank === 3 ? '🥉' :
            chalk.dim(`${agent.rank}.`);
          
          const style = agent.rank <= 3 ? chalk.bold : (s: string) => s;
          
          console.log(`  ${medal} ${style(agent.name.padEnd(20))} ${chalk.greenBright(agent.reputation)} pts`);
        }
      }
      
      console.log();
    });
  
  // Heartbeat (alias for notifications)
  program
    .command('heartbeat')
    .description('Alias for notifications')
    .action(async () => {
      requireAuth();
      
      const spinner = startSpinner('Checking...');
      const result = await api.getNotifications(true);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      printResult({ unreadCount: result.data!.unreadCount });

      if (result.data!.unreadCount === 0) {
        if (!isJsonMode) {
            console.log(chalk.greenBright('✓ No pending actions'));
        }
        return;
      }
      
      printBox([
          `${result.data!.unreadCount} notification(s) require attention`,
          'Run: moltbet notifications'
      ], 'warning');
    });
}
