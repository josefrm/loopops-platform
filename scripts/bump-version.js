#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read current version
const versionPath = path.join(__dirname, '..', 'version.json');
const packagePath = path.join(__dirname, '..', 'package.json');

function readVersion() {
  try {
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    return versionData;
  } catch (error) {
    console.error('Error reading version.json:', error);
    process.exit(1);
  }
}

function writeVersion(versionData) {
  try {
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n');
  } catch (error) {
    console.error('Error writing version.json:', error);
    process.exit(1);
  }
}

function updatePackageJson(version, build) {
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageData.version = `${version}-build.${build}`;
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
  } catch (error) {
    console.error('Error updating package.json:', error);
    process.exit(1);
  }
}

function bumpVersion(type = 'build') {
  const currentVersion = readVersion();
  
  if (type === 'patch') {
    const [major, minor, patch] = currentVersion.version.split('.').map(Number);
    currentVersion.version = `${major}.${minor}.${patch + 1}`;
    currentVersion.build = '1';
  } else if (type === 'minor') {
    const [major, minor] = currentVersion.version.split('.').map(Number);
    currentVersion.version = `${major}.${minor + 1}.0`;
    currentVersion.build = '1';
  } else if (type === 'major') {
    const [major] = currentVersion.version.split('.').map(Number);
    currentVersion.version = `${major + 1}.0.0`;
    currentVersion.build = '1';
  } else {
    // Default to build bump
    currentVersion.build = String(Number(currentVersion.build) + 1);
  }
  
  writeVersion(currentVersion);
  updatePackageJson(currentVersion.version, currentVersion.build);
  
  console.log(`✅ Version bumped to ${currentVersion.version}-build.${currentVersion.build}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const bumpType = args[0] || 'build';

if (!['major', 'minor', 'patch', 'build'].includes(bumpType)) {
  console.error('Invalid bump type. Use: major, minor, patch, or build');
  process.exit(1);
}

bumpVersion(bumpType);
