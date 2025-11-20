const path = require('path');
const os = require('os');
const fs = require('fs');

const getStoragePath = () => {
  return path.join(os.homedir(), '.bookmarks-app');
};

const getBookmarksFilePath = () => {
  return path.join(getStoragePath(), 'bookmarks.json');
};

const ensureStorageDirectory = () => {
  const storagePath = getStoragePath();
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
};

module.exports = {
  getStoragePath,
  getBookmarksFilePath,
  ensureStorageDirectory,
};
