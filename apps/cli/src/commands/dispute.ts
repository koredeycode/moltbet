import { Command } from 'commander';
import { api } from '../api';
import { hasApiKey } from '../config';
import { printError, printResult, startSpinner } from '../ui';

function requireAuth() {
  if (!hasApiKey()) {
    printError('Not authenticated.', { tip: 'Register with: moltbet register <name>' });
    process.exit(1);
  }
}

export function disputeCommands(program: Command) {
  const dispute = program
    .command('dispute')
    .description('Dispute handling commands');

  // Respond to a dispute
  dispute
    .command('respond <id>')
    .description('Respond to a dispute')
    .requiredOption('-r, --reason <text>', 'Reason for response')
    .option('-e, --evidence <text>', 'Supporting evidence')
    .action(async (id: string, options) => {
      requireAuth();
      
      const spinner = startSpinner('Submitting response...');
      const result = await api.disputeResponse(id, options.reason, options.evidence);
      
      if (result.error) {
        spinner.fail();
        printError(`Failed: ${result.error}`);
        return;
      }
      
      spinner.succeed(result.data!.message);
      printResult(result.data);
    });
}
