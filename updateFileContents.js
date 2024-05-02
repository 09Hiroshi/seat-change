/**
 * Modifies a file by removing unnecessary lines and fixing indentation.
 * @async
 * @function updateFileContents
 * @returns {Promise<void>} A promise that resolves when the file has been modified successfully.
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, './dist/main.js');

async function updateFileContents() {
  try {
    let data = await fs.readFile(filePath, 'utf8');
    let lines = data.split('\n');

    const useStrictIndex = lines.findIndex(line => line.includes('"use strict";'));
    if (useStrictIndex !== -1 && lines[useStrictIndex + 1].trim() === '(() => {') {
      lines.splice(useStrictIndex + 1, 1); // "use strict"; の1行下の `(() => {` を削除
    } else {
      throw new Error('Could not find "(() => {" after "use strict";');
    }

    if (lines[lines.length - 2].trim() === '})();') {
      lines.splice(lines.length - 2, 1); // 下から2行目の `})();` を削除
    } else {
      throw new Error('Could not find "})();"" before the last line');
    }

    // 各行のインデントを修正
    let modifiedData = lines.map(line => line.replace(/^ {2}/, '')).join('\n');

    await fs.writeFile(filePath, modifiedData, 'utf8');
    console.log('File has been modified successfully.');
  } catch (err) {
    console.error('Error modifying the file:', err);
  }
}

updateFileContents();