import { outputFile } from 'fs-extra';
import { resolve as resolvePath } from 'path';
import {
  Analyzer,
  FsUrlLoader,
  generateAnalysis as processAnalysis,
  PackageUrlResolver
} from 'polymer-analyzer';

import { Config } from '../config';
import { Options } from '../types';
import { glob } from '../utils';

/**
 * Run the build process.
 */
export async function run(_options: Options, config: Config): Promise<void> {
  return generateAutoAnalysis(config);
}

/**
 * Generate an analysis of the component from it's dist files.
 */
export async function generateAutoAnalysis(config: Config): Promise<void> {
  const analyzer = new Analyzer({
    urlLoader: new FsUrlLoader('./'),
    urlResolver: new PackageUrlResolver({
      packageDir: './'
    })
  });

  const files = await glob(`${config.dist.path}/**/*.mjs`);
  const analysis = await analyzer.analyze(files);
  const formattedAnalysis = processAnalysis(analysis, analyzer.urlResolver);
  const analysisFileContents = JSON.stringify(formattedAnalysis, undefined, 2);

  await outputFile(
    resolvePath('auto-analysis.json'),
    analysisFileContents
  );
}
