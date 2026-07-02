import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionPath = path.resolve(__dirname, '../../');
    await runTests({ extensionPath, testPath: __dirname });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
