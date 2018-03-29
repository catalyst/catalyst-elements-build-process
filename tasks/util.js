// Libraries.
const colors = require('ansi-colors');
const del = require('del');
const log = require('fancy-log');
const stripColor = require('strip-color');

// Helper functions for tasks.
const tasksHelpers = {
  log: {
    starting: (label, prefix = '') => {
      const fullLabel = `${colors.grey(stripColor(prefix))} ${colors.blue(
        '→'
      )} ${colors.cyan(label)}`;

      log(`Starting   ${fullLabel}...`);
      return fullLabel;
    },
    successful: (label, prefix = '') => {
      const fullLabel = `${colors.grey(stripColor(prefix))} ${colors.blue(
        '→'
      )} ${colors.cyan(label)}`;

      log(`Finished   ${fullLabel} ${colors.green('✓')}`);
      return fullLabel;
    },
    failed: (label, prefix = '') => {
      const fullLabel = `${colors.grey(stripColor(prefix))} ${colors.blue(
        '→'
      )} ${colors.cyan(label)}`;

      log(`Failed     ${fullLabel} ${colors.red('✗')}`);
      return fullLabel;
    },
    info: (label, prefix = '') => {
      const fullLabel = `${colors.grey(stripColor(prefix))} ${colors.blue(
        '→'
      )} ${colors.white(label)}`;

      log(`Info       ${fullLabel}`);
      return label;
    }
  }
};

/**
 * Clean a path.
 *
 * @param {string} path - The path to clean.
 * @param {string} [label] - The label to show on the console after `clean: `
 * @param {string} [labelPrefix] - A prefix to print before the label
 * @returns {Promise}
 */
function clean(path, label, labelPrefix) {
  const subTaskLabel = `clean: ${label == null ? path : label}`;

  return new Promise(async resolve => {
    tasksHelpers.log.starting(subTaskLabel, labelPrefix);
    await del(path);
    tasksHelpers.log.successful(subTaskLabel, labelPrefix);
    resolve();
  });
}

/**
 * Returns a new promise that will not resolving or rejecting until all the given
 * promises to finish either resolved or rejected.
 *
 * @param {Promise[]} promises - The promise to wait for
 * @returns {Promise}
 */
function waitForAllPromises(promises) {
  return new Promise(async (resolve, reject) => {
    const results = await Promise.all(
      promises.map(async promise => {
        try {
          const value = await promise;
          return { value: value, status: 0 };
        } catch (error) {
          return { error: error, status: 1 };
        }
      })
    );

    if (results.filter(result => result.status === 1).length === 0) {
      resolve(results);
    } else {
      reject(new Error(results));
    }
  });
}

/**
 * Transform function that returns the contents of the given file.
 *
 * @param {string} filePath
 *   The file path.
 * @param {File} file
 *   The file.
 * @returns {string}
 */
function transformGetFileContents(filePath, file) {
  return file.contents.toString('utf8');
}

module.exports = {
  // Clean tasks.
  cleanDist: (config, labelDepth) =>
    clean(`./${config.dist.path}`, 'dist', labelDepth),
  cleanTemp: (config, labelDepth) =>
    clean(`./${config.temp.path}`, 'temp', labelDepth),
  cleanDocs: (config, labelDepth) =>
    clean(`./${config.docs.path}`, 'docs', labelDepth),

  // Transform functions.
  transforms: {
    getFileContents: transformGetFileContents
  },

  tasks: tasksHelpers,

  waitForAllPromises: waitForAllPromises,

  NotOKError: class NotOKError extends Error {}
};
