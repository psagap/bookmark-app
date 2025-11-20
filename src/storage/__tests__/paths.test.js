const path = require('path');
const os = require('os');
const { getStoragePath, ensureStorageDirectory } = require('../paths');

describe('Storage Paths', () => {
  test('getStoragePath returns correct directory', () => {
    const storagePath = getStoragePath();
    expect(storagePath).toBe(path.join(os.homedir(), '.bookmarks-app'));
  });

  test('getBookmarksFilePath returns correct file path', () => {
    const { getBookmarksFilePath } = require('../paths');
    const filePath = getBookmarksFilePath();
    expect(filePath).toBe(path.join(os.homedir(), '.bookmarks-app', 'bookmarks.json'));
  });

  test('ensureStorageDirectory creates directory if it does not exist', () => {
    const fs = require('fs');
    const testDir = path.join(os.homedir(), '.bookmarks-app');

    // Clean up if exists
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }

    ensureStorageDirectory();
    expect(fs.existsSync(testDir)).toBe(true);
  });
});
