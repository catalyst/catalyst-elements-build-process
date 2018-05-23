// Libraries.
import deepMerge from 'deepmerge';
import { readFile as _readFile } from 'fs';
import { promisify } from 'util';

// Config
import { defaultConfig, IConfig } from './config';

// Load the tasks.
import { analyze } from './tasks/analyze';
import { build } from './tasks/build';
import { buildDocs } from './tasks/buildDocs';
import { fixDependencies } from './tasks/fixDependencies';
import { lint } from './tasks/lint';
import { publish, publishDry } from './tasks/publish';
import { test } from './tasks/test';
import { cleanTemp } from './util';

// Promisified functions.
const readFile = promisify(_readFile);

/**
 * Get the config for the build process.
 *
 * @param options - Any changes to the default config.
 * @throws {Error}
 */
export async function getConfig(options?: Partial<IConfig>): Promise<IConfig> {
  // Read and save the package.json file.
  const projectPackage:
    | { readonly [key: string]: any }
    | undefined = JSON.parse(
    await readFile('./package.json', { encoding: 'utf8', flag: 'r' })
  );

  // Make sure the file was successfully loaded.
  if (projectPackage === undefined) {
    throw new Error('Failed to load package.json');
  }

  // Make sure the there is a name field.
  if (
    Object.prototype.hasOwnProperty(projectPackage.name) ||
    typeof projectPackage.name !== 'string'
  ) {
    throw new Error(
      'package.json does not contain a name property as a string'
    );
  }

  // Get the package scope of the component
  const packageScope = projectPackage.name.substring(
    0,
    projectPackage.name.lastIndexOf('/')
  );

  // Get the location of the node modules.
  const projectNodeModulesPath =
    options !== undefined && options.nodeModulesPath !== undefined
      ? options.nodeModulesPath
      : defaultConfig.nodeModulesPath;

  // Get the location in node modules the component fill be located once published.
  const componentNodeModulesPath = `${projectNodeModulesPath}${
    packageScope === '' ? '' : `/${packageScope}`
  }`;

  // All the automatically set options in the config (can be overridden with `options`)
  const autoLoadedConfig: Partial<IConfig> = {
    package: projectPackage,
    componenet: {
      scope: packageScope === '' ? null : packageScope,
      nodeModulesPath: componentNodeModulesPath
    }
  };

  // Update the config.
  const config =
    options !== undefined
      ? deepMerge.all<IConfig>([defaultConfig, autoLoadedConfig, options])
      : deepMerge.all<IConfig>([defaultConfig, autoLoadedConfig]);

  // Check the new config is all good.
  if (!(config.build.script.create || config.build.module.create)) {
    throw new Error(
      'Invalid config - Both building of the module and the script cannot be turned off.'
    );
  }

  if (config.build.script.extension === config.build.module.extension) {
    throw new Error(
      'Invalid config - The module and the script cannot both have the same file extension.'
    );
  }

  // Return the config.
  return config;
}

export const tasks = {
  /**
   * Analyse the component.
   */
  analyze: (
    taskName = 'analyze',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return analyze(taskName, await getConfig());
    }
    return analyze(taskName, await config);
  },

  /**
   * Build the component.
   */
  build: (
    taskName = 'build',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return build(taskName, await getConfig());
    }
    return build(taskName, await config);
  },

  /**
   * Build the docs for the component.
   */
  buildDocs: (
    taskName = 'docs',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return buildDocs(taskName, await getConfig());
    }
    return buildDocs(taskName, await config);
  },

  /**
   * Clean the temp folder.
   */
  clean: (
    taskName = 'clean',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return cleanTemp(await getConfig(), taskName);
    }
    return cleanTemp(await config, taskName);
  },

  /**
   * Fix issue with the dependencies.
   */
  fixDependencies: (
    taskName = 'fix dependencies',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return fixDependencies(taskName, await getConfig());
    }
    return fixDependencies(taskName, await config);
  },

  /**
   * Lint the component's source code.
   */
  lint: (
    taskName = 'lint',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return lint(taskName, await getConfig());
    }
    return lint(taskName, await config);
  },

  /**
   * Publish the component.
   */
  publish: (
    taskName = 'publish',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return publish(taskName, await getConfig());
    }
    return publish(taskName, await config);
  },

  /**
   * Perform a dry run of publish the component.
   */
  publishDry: (
    taskName = 'publish (dry run), config',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return publishDry(taskName, await getConfig());
    }
    return publishDry(taskName, await config);
  },

  /**
   * Test the component.
   */
  test: (
    taskName = 'test',
    config?: Promise<IConfig> | IConfig
  ) => async () => {
    if (config === undefined) {
      return test(taskName, await getConfig());
    }
    return test(taskName, await config);
  }
};
