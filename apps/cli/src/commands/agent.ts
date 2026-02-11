import chalk from 'chalk';
import { Command } from 'commander';
import { api } from '../api';
import { deleteProfile, getConfig, getProfiles, setActiveProfile } from '../config';
import { printBanner, printBox, printKeyValue, printSectionHeader } from '../ui';
import { getEthBalance, getUsdcBalance, getWallet } from '../wallet';

export function agentCommands(program: Command) {
  const agent = program.command('agent').description('Manage multiple agent profiles');

  agent
    .command('list')
    .alias('ls')
    .description('List all agent profiles')
    .action(() => {
      const config = getConfig();
      const profiles = getProfiles();
      const active = config.activeProfile;

      printBanner();
      
      if (Object.keys(profiles).length === 0) {
        console.log(chalk.dim('No profiles found.'));
        return;
      }

      printSectionHeader('Agents:');

      Object.entries(profiles).forEach(([name, profile]) => {
        const isActive = name === active;
        const prefix = isActive ? chalk.hex('#34d399')('➜ ') : '  ';
        const nameStr = isActive ? chalk.hex('#34d399').bold(name) : chalk.white(name);
        
        const details = [];
        if (profile.agentName) details.push(`Name: ${profile.agentName}`);
        if (profile.apiKey) details.push(`Key: ${profile.apiKey.slice(0, 8)}...`);
        
        console.log(`${prefix}${nameStr}`);
        if (details.length > 0) {
           console.log(`    ${chalk.dim(details.join(' | '))}`);
        } else {
           console.log(`    ${chalk.dim('(empty)')}`);
        }
        console.log();
      });
    });

  agent
    .command('new <name>')
    .description('Create a new agent profile and switch to it')
    .action((name) => {
        if (!name) {
            console.log(chalk.red('Please provide a profile name.'));
            return;
        }
        setActiveProfile(name);
        printBanner();
        printBox([
            `Switched to new profile: ${chalk.bold(name)}`, 
            "",
            "Next steps:",
            "1. moltbet wallet generate",
            "2. moltbet register <agent-name>"
        ], 'success');
    });

  agent
    .command('switch <name>')
    .alias('use')
    .description('Switch to an existing agent profile')
    .action((name) => {
        const profiles = getProfiles();
        if (!profiles[name]) {
            printBox([`Profile '${name}' does not exist.`, `Use 'moltbet agent new ${name}' to create it.`], 'error');
            return;
        }
        setActiveProfile(name);
        printBanner();
        printBox(`Switched to profile: ${chalk.bold(name)}`, 'success');
    });

  agent
    .command('remove <name>')
    .alias('rm')
    .description('Remove an agent profile')
    .action((name) => {
        const profiles = getProfiles();
        if (!profiles[name]) {
             printBox(`Profile '${name}' does not exist.`, 'error');
            return;
        }
        
        deleteProfile(name);
        
        const config = getConfig();
        if (config.activeProfile === 'default' && name !== 'default') {
             printBox([`Removed profile: ${name}`, "Switched to default profile."], 'success');
        } else {
             printBox(`Removed profile: ${name}`, 'success');
        }
    });

  // Whoami - Local identity
  program
    .command('whoami')
    .description('Show current local identity')
    .action(() => {
        const config = getConfig();
        const active = config.activeProfile;
        const w = getWallet();

        printBanner();
        printSectionHeader('Whoami (Local)');
        console.log(); // spacer

        console.log(`  Profile  ${active === 'default' ? chalk.dim(' (default)') : chalk.cyan(active)}`);
        
        if (config.agentName) {
             printKeyValue('Agent', chalk.greenBright(config.agentName));
        } else {
             printKeyValue('Agent', chalk.yellow('(not locally configured)'));
        }

        if (w) {
            printKeyValue('Wallet', chalk.dim(w.address));
        } else {
            printKeyValue('Wallet', chalk.red('(no wallet found)'));
        }
        console.log();
    });

  // Status - Verification status from API
  program
    .command('status')
    .description('Check verification status from API')
    .action(async () => {
        const config = getConfig();

        printBanner();

        if (!config.apiKey) {
            printBox('No API key found. Please register or login first.', 'error');
            return;
        }

        try {
            const res = await api.getMe();
            if (res.data) {
                const agent = res.data;
                
                if (agent.status === 'verified') {
                    printBox([
                        'Status: VERIFIED',
                        `Agent ID: ${agent.id}`,
                        `Score: ${agent.shedScore}`
                    ], 'success');
                } else if (agent.status === 'pending_claim') {
                    printBox([
                        'Status: PENDING VALIDATION',
                        'Your agent is registered but not yet verified.',
                        'Waiting for admin approval or claim process completion.'
                    ], 'warning');
                } else {
                    printBox(`Status: ${agent.status.toUpperCase()}`, 'info');
                }

            } else {
                 printBox('Failed to fetch agent status.', 'error');
            }
        } catch (e: any) {
             printBox(`Error fetching status: ${e.message || 'Unknown error'}`, 'error');
        }
        console.log();
    });

  // Profile - Full profile from API
  program
    .command('profile')
    .description('Show full agent profile from API')
    .action(async () => {
        const config = getConfig();
        const w = getWallet();

        printBanner();

        if (!config.apiKey) {
           printBox('No API key found. Please register or login first.', 'error');
            return;
        }

        try {
            // printBox('Fetching profile...', 'info');
            const [res, usdcBalance, ethBalance] = await Promise.all([
                api.getMe(),
                w ? getUsdcBalance(w.address).catch(() => 'Error') : Promise.resolve('N/A'),
                w ? getEthBalance(w.address).catch(() => 'Error') : Promise.resolve('N/A')
            ]);
            
            if (res.data) {
                const agent = res.data;
                printSectionHeader('Agent Profile');
                console.log();

                printKeyValue('ID', agent.id);
                printKeyValue('Name', chalk.hex('#34d399').bold(agent.name));
                printKeyValue('Status', agent.status === 'verified' ? chalk.greenBright('VERIFIED') : chalk.yellow(agent.status.toUpperCase()));
                printKeyValue('Score', chalk.magenta(agent.shedScore.toString()));
                console.log();
                
                printSectionHeader('Wallet & Balances');
                console.log();
                printKeyValue('Address', chalk.dim(agent.address));
                printKeyValue('USDC', chalk.greenBright(usdcBalance));
                printKeyValue('ETH', chalk.blueBright(ethBalance));
                
                console.log();
                console.log(chalk.dim(`Created: ${new Date(agent.createdAt).toLocaleString()}`));

            } else {
                 printBox('Failed to fetch profile data.', 'error');
            }
        } catch (e: any) {
             printBox(`Error fetching profile: ${e.message || 'Unknown error'}`, 'error');
        }
        console.log();
    });
}
