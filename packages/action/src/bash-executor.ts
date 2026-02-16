import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class BashExecutor {
  private dangerousCommands = [
    'rm -rf',
    'sudo',
    'mkfs',
    'dd',
    '> /dev/',
    'chmod 777',
  ];

  isDangerous(command: string): boolean {
    return this.dangerousCommands.some((dangerous) =>
      command.includes(dangerous)
    );
  }

  async execute(command: string): Promise<{ output: string; error?: string }> {
    if (this.isDangerous(command)) {
      return {
        output: '',
        error: 'Comando peligroso bloqueado. Requiere aprobación manual.',
      };
    }
    try {
      console.log(`[BashExecutor] Ejecutando: ${command}`);
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      return {
        output: stdout || stderr || 'Comando ejecutado sin salida',
      };
    } catch (error: unknown) {
      const err = error as { message?: string; stderr?: string };
      return {
        output: '',
        error: err.stderr || err.message || 'Error desconocido',
      };
    }
  }
}
