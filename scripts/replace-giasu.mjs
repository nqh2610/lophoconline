import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';

const srcDir = 'e:/LopHocTrucTuyen/src';

async function getAllFiles(dir) {
  const files = [];
  const items = await readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await getAllFiles(fullPath));
    } else if (['.ts', '.tsx'].includes(extname(item.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function replaceInFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  let newContent = content
    .replace(/GIA SƯ/g, 'GIÁO VIÊN')
    .replace(/Gia Sư/g, 'Giáo Viên')
    .replace(/Gia sư/g, 'Giáo viên')
    .replace(/gia sư/g, 'giáo viên');
  
  if (content !== newContent) {
    await writeFile(filePath, newContent, 'utf8');
    console.log('Updated:', filePath);
    return 1;
  }
  return 0;
}

async function main() {
  const files = await getAllFiles(srcDir);
  let count = 0;
  
  for (const file of files) {
    count += await replaceInFile(file);
  }
  
  console.log(`Total files updated: ${count}`);
}

main().catch(console.error);
