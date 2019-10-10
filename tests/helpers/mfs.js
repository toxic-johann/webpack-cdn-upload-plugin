const mfs = require('memfs');
const joinPath = require('memory-fs/lib/join');
function ensureWebpackMemoryFs(fs) {
  // Return it back, when it has Webpack 'join' method
  if (fs.join) {
    return fs;
  }

  // Create FS proxy, adding `join` method to memfs, but not modifying original object
  const nextFs = Object.create(fs);
  nextFs.join = joinPath;

  return nextFs;
}

module.exports = ensureWebpackMemoryFs(mfs);
