import chalk from 'chalk';

// Theme - Neon Green to match frontend
const THEME = {
    primary: chalk.hex('#34d399'), // Emerald-400
    secondary: chalk.hex('#10b981'), // Emerald-500
    dim: chalk.gray,
    error: chalk.red,
    warning: chalk.yellow,
    success: chalk.greenBright,
};

let isJsonMode = false;

export function setJsonMode(enabled: boolean) {
    isJsonMode = enabled;
}

const TAGLINES = [
    "Fortune favors the bold... and the automated.",
    "Don't trust, verify. Then bet on it.",
    "The house doesn't always win when you are the house.",
    "Predicting the future, one transaction at a time.",
    "High stakes, higher uptime.",
    "Smart contracts, smarter bets.",
    "Because prediction markets shouldn't be boring.",
    "The odds be ever in your code.",
    "Putting the 'smart' in smart contracts.",
    "Where code meets liquidity.",
    "Not financial advice, but nice commit.",
    "Escrow or it didn't happen.",
    "Trustless betting, trusted execution.",
    "Your agent, your rules, your winnings.",
    "Decentralized prediction, centralized profit.",
    "Because the house shouldn't rely on trust.",
];

export function printBanner(version: string = '0.1.0', commit?: string) {
    if (isJsonMode) return;
    const tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
    const commitStr = commit ? `(${commit})` : '';
    
    console.log();
    console.log(`${THEME.primary.bold('🎲 Moltbet CLI')} ${THEME.dim(version)} ${THEME.dim(commitStr)} – ${THEME.error(tagline)}`);
    console.log();
}

export function printSectionHeader(title: string) {
    if (isJsonMode) return;
    console.log(THEME.secondary.bold(title));
    console.log(THEME.dim('─'.repeat(40)));
}

export function printKeyValue(key: string, value: string, padLength: number = 10) {
    if (isJsonMode) return;
    console.log(`  ${key.padEnd(padLength)} ${value}`);
}

export function printBox(content: string | string[], type: 'info' | 'warning' | 'error' | 'success' = 'info') {
    if (isJsonMode) {
        if (type === 'error' || type === 'warning') {
            const message = Array.isArray(content) ? content.join(' ') : content;
            console.error(JSON.stringify({ status: 'error', message }));
        }
        return;
    }
    const lines = Array.isArray(content) ? content : [content];
    let borderColor = THEME.dim;
    let icon = 'ℹ';

    switch (type) {
        case 'warning': borderColor = THEME.warning; icon = '⚠'; break;
        case 'error': borderColor = THEME.error; icon = '✖'; break;
        case 'success': borderColor = THEME.success; icon = '✓'; break;
        case 'info': borderColor = THEME.secondary; icon = 'ℹ'; break;
    }

    const maxLength = Math.max(...lines.map(l => l.length));
    const border = borderColor('─'.repeat(maxLength + 4));
    
    console.log(`  ${icon}  ${borderColor('│')} `);
    lines.forEach(line => {
        console.log(`     ${borderColor('│')} ${line}`);
    });
    console.log(`     ${borderColor('╰' + '─'.repeat(maxLength + 2))}`);
    console.log();
}

export function printTable(headers: string[], rows: string[][]) {
    if (isJsonMode) return;
    // Simple table implementation can be added if needed, 
    // for now we stick to standardized list views
}

/**
 * Standardized output for AI agents and CLI users
 * @param data The data object to print
 */
export function printResult(data: any) {
    if (isJsonMode) {
        console.log(JSON.stringify({ status: 'success', data }, null, 2));
    }
}

/**
 * Print an info message box
 * @param message Info message
 */
export function printInfo(message: string | string[]) {
    if (isJsonMode) return;
    printBox(message, 'info');
}

/**
 * Standardized error for AI agents and CLI users
 * @param message Error message
 * @param details Optional additional details
 */
export function printError(message: string, details?: any) {
    if (isJsonMode) {
        console.error(JSON.stringify({ status: 'error', message, details }, null, 2));
    } else {
        printBox(message, 'error');
        if (details) {
            console.log(chalk.dim(JSON.stringify(details, null, 2)));
        }
    }
}

/**
 * Start a spinner (silent in JSON mode)
 */
import ora from 'ora';
export function startSpinner(text: string) {
    if (isJsonMode) {
        return {
            stop: () => {},
            succeed: () => {},
            fail: () => {},
            text: '',
        };
    }
    return ora(text).start();
}

export { isJsonMode, THEME };

