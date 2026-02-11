const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const rootDir = path.resolve(__dirname, '..', '..', '..');
const appDir = path.resolve(__dirname, '..', 'app');

const FILES = [
    'index.html',
    'main.js',
    'style.css',
    'interactionEnhancer.js',
    'diagnose-loading.js'
];

const DIRS = [
    'src',
    'presets'
];

async function copyFileToApp(fileName) {
    const src = path.join(rootDir, fileName);
    const dest = path.join(appDir, fileName);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(src, dest);
}

async function copyDirToApp(dirName) {
    const src = path.join(rootDir, dirName);
    const dest = path.join(appDir, dirName);
    await fsp.mkdir(dest, { recursive: true });
    await fsp.cp(src, dest, { recursive: true, force: true });
}

async function main() {
    await fsp.mkdir(appDir, { recursive: true });

    for (const fileName of FILES) {
        if (!fs.existsSync(path.join(rootDir, fileName))) {
            continue;
        }
        await copyFileToApp(fileName);
    }

    for (const dirName of DIRS) {
        if (!fs.existsSync(path.join(rootDir, dirName))) {
            continue;
        }
        await copyDirToApp(dirName);
    }
}

main().catch((err) => {
    console.error('[prepare-assets] Failed:', err);
    process.exit(1);
});
