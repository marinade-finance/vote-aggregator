const path = require('node:path');

module.exports = {
  // resolves from test to snapshot path
  resolveSnapshotPath: (testPath, snapshotExtension) => {
    const testSourcePath = testPath.replace('build/', '').replace('.js', '.ts');
    const testDirectory = path.dirname(testSourcePath);
    const testFilename = path.basename(testSourcePath);
    return `${testDirectory}/__snapshots__/${testFilename}${snapshotExtension}`;
  },

  // resolves from snapshot to test path
  resolveTestPath: (snapshotFilePath, snapshotExtension) =>
    snapshotFilePath
      .replace('__snapshots__/', '')
      .replace('.ts', '.js')
      .replace(snapshotExtension, '')
      .replace('__tests__/', 'build/__tests__/'),

  // Example test path, used for preflight consistency check of the implementation above
  testPathForConsistencyCheck: 'build/__tests__/root/createRoot.spec.js',
};
