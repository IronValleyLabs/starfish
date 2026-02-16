import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class BashExecutor {
  private dangerousPatterns = [
    'rm -rf',
    'rm -fr',
    'sudo',
    'mkfs',
    'dd ',
    '> /dev/',
    '>> /dev/',
    'chmod 777',
    'chmod +s',
    'eval ',
    'eval(',
    'base64 -d',
    'base64 -D',
    '| sh',
    '| bash',
    '| zsh',
    '$(',
    '`',
  ];

  isDangerous(command: string): boolean {
    const normalized = command.trim();
    return this.dangerousPatterns.some((p) =>
      normalized.includes(p)
    );
  }

  async execute(command: string): Promise<{ output: string; error?: string }> {
    if (this.isDangerous(command)) {
      return {
        output: '',
        error: 'Dangerous command blocked. Manual approval required.',
      };
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      return {
        output: stdout || stderr || 'Command completed with no output',
      };
    } catch (error: unknown) {
      const err = error as { message?: string; stderr?: string };
      return {
        output: '',
        error: err.stderr || err.message || 'Unknown error',
      };
    }
  }
}
