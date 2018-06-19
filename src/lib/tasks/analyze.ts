// Libraries.
import { copy, ensureDir, writeFile } from 'fs-extra';
import {
  basename as getFileBasename,
  extname as getFileExtension,
  normalize as normalizePath
} from 'path';
import {
  Analyzer,
  FsUrlLoader,
  generateAnalysis as processAnalysis,
  PackageUrlResolver
} from 'polymer-analyzer';
import {
  Analysis as ProcessedAnalysis,
  Class,
  Demo,
  Element,
  ElementMixin,
  Namespace
} from 'polymer-analyzer/lib/analysis-format/analysis-format';

import { IConfig } from '../config';
import {
  glob,
  logTaskFailed,
  logTaskStarting,
  logTaskSuccessful,
  runTasksParallel
} from '../util';

// The temp path.
const tempSubpath = 'analyze';

/**
 * Analyze the component.
 *
 * @param config - Config settings
 */
export async function analyze(
  taskName: string,
  config: IConfig
): Promise<void> {
  await copyElementsForAnalysis(config, taskName);
  await generateAnalysis(config, taskName);
}

/**
 * Generate the analysis.
 *
 * @param config - Config settings
 * @param labelPrefix - A prefix to print before
 */
async function generateAnalysis(
  config: IConfig,
  labelPrefix: string
): Promise<void> {
  const subTaskLabel = 'generate';

  try {
    logTaskStarting(subTaskLabel, labelPrefix);

    const files = await glob(`./${config.temp.path}/${tempSubpath}/**/*.js`);
    const analyzer = new Analyzer({
      urlLoader: new FsUrlLoader('./'),
      urlResolver: new PackageUrlResolver({
        packageDir: './'
      })
    });

    const analysis = await analyzer.analyze(files);
    const formattedAnalysis = processAnalysis(analysis, analyzer.urlResolver);
    const formattedfixedAnalysis = fixAnalysis(formattedAnalysis, config);

    const analysisFileContents = JSON.stringify(
      formattedfixedAnalysis,
      undefined,
      2
    );
    const minifiedAnalysisFileContents = JSON.stringify(formattedfixedAnalysis);

    await runTasksParallel([
      (async () => {
        await ensureDir(`.`);
        await writeFile(
          `./${config.docs.analysisFilename}`,
          analysisFileContents,
          {
            encoding: 'utf8'
          }
        );
      })(),
      (async () => {
        await ensureDir(`./${config.docs.path}`);
        await writeFile(
          `./${config.docs.path}/${config.docs.analysisFilename}`,
          minifiedAnalysisFileContents,
          { encoding: 'utf8' }
        );
      })()
    ]);

    logTaskSuccessful(subTaskLabel, labelPrefix);
  } catch (error) {
    logTaskFailed(subTaskLabel, labelPrefix);
    throw error;
  }
}

/**
 * Fix issues with the automatically generated analysis.
 *
 * @param analysis - The generated analysis.
 * @param config - Config settings
 */
function fixAnalysis(
  analysis: ProcessedAnalysis,
  config: IConfig
): ProcessedAnalysis {
  return {
    ...analysis,
    ...{
      elements: fixAnalysisElements(analysis.elements, config),
      mixins: fixAnalysisElementMixins(analysis.mixins, config),
      namespaces: fixAnalysisNamespaces(analysis.namespaces, config),
      classes: fixAnalysisClasses(analysis.classes, config)
    }
  };
}

/**
 * Fix the namespaces in the analysis.
 */
function fixAnalysisNamespaces(
  namespaces: ReadonlyArray<Namespace> | undefined,
  config: IConfig
): Array<Namespace> | undefined {
  return (
    namespaces === undefined
      ? undefined
      : namespaces.map((namespace) => {
          return {
            ...namespace,
            elements: fixAnalysisElements(namespace.elements, config),
            mixins: fixAnalysisElementMixins(namespace.mixins, config),
            classes: fixAnalysisClasses(namespace.classes, config)
          };
        })
  );
}

/**
 * Fix the elements in the analysis.
 */
function fixAnalysisElements(
  elements: ReadonlyArray<Element> | undefined,
  config: IConfig
): Array<Element> | undefined {
  return (
    elements === undefined
      ? undefined
      : elements.map((element) => {
          return {
            ...element,
            path: (
              element.path === undefined
                ? undefined
                : fixAnalysisComponentPath(element.path, config)
            ),
            demos: (
              element.path === undefined
                ? element.demos
                : fixAnalysisComponentDemos(element.path, element.demos)
            )
          };
        })
  );
}

/**
 * Fix the mixins in the analysis.
 */
function fixAnalysisElementMixins(
  elementMixins: ReadonlyArray<ElementMixin> | undefined,
  config: IConfig
): Array<ElementMixin> | undefined {
  return (
    elementMixins === undefined
      ? undefined
      : elementMixins.map((mixin) => {
          return {
            ...mixin,
            path: (
              mixin.path === undefined
                ? undefined
                : fixAnalysisComponentPath(mixin.path, config)
            ),
            demos: (
              mixin.path === undefined
                ? mixin.demos
                : fixAnalysisComponentDemos(mixin.path, mixin.demos)
            )
          };
        })
  );
}

/**
 * Fix the classes in the analysis.
 */
function fixAnalysisClasses(
  classes: ReadonlyArray<Class> | undefined,
  config: IConfig
): Array<Class> | undefined {
  return (
    classes === undefined
      ? undefined
      : classes.map((classComponent) => {
          return {
            ...classComponent,
            path: (
              classComponent.path === undefined
                ? undefined
                : fixAnalysisComponentPath(classComponent.path, config)
            ),
            demos: (
              classComponent.path === undefined
                ? classComponent.demos
                : fixAnalysisComponentDemos(classComponent.path, classComponent.demos)
            )
          };
        })
  );
}

/**
 * Don't refer to the file's temp path, but rather its node path.
 */
function fixAnalysisComponentPath(
  componentPath: string,
  config: IConfig
): string | undefined {
  const pathBase = getFileBasename(
    componentPath,
    getFileExtension(componentPath)
  );

  const nodeScope =
    config.component.scope === undefined
      ? ''
      : `/${config.component.scope}`;

  return (
    componentPath.indexOf(`${config.temp.path}/${tempSubpath}/`) === 0
      ? `node_modules${nodeScope}/${pathBase}/${pathBase}${
          config.build.module.extension}`
      : componentPath
    );
}

/**
 * Prefix the demos' url.
 */
function fixAnalysisComponentDemos(
  componentPath: string,
  demos: Array<Demo>
): Array<Demo> {
  const pathBase = getFileBasename(
    componentPath,
    getFileExtension(componentPath)
  );

  return demos.map((demo) => {
    return {
      ...demo,
      url: normalizePath(`../${pathBase}/${demo.url}`)
    };
  });
}

/**
 * Copy all the elements over to the temp folder for analysis.
 *
 * @param config - Config settings
 * @param labelPrefix - A prefix to print before
 */
async function copyElementsForAnalysis(
  config: IConfig,
  labelPrefix: string
): Promise<void> {
  const subTaskLabel = 'get files';

  try {
    logTaskStarting(subTaskLabel, labelPrefix);

    const filepaths = await glob([
      `./${config.dist.path}/**/*${config.build.module.extension}`,
      `./node_modules/catalyst-*/**/*${config.build.module.extension}`
    ]);

    await Promise.all(
      filepaths.map(async (filepath) => {
        // Polymer analyser currently only support .js files.
        const ext = config.build.module.extension.substring(
          config.build.module.extension.lastIndexOf('.')
        );
        const outpath = `./${config.temp.path}/${tempSubpath}/${getFileBasename(
          filepath,
          ext
        )}.js`;

        await copy(filepath, outpath);
      })
    );

    logTaskSuccessful(subTaskLabel, labelPrefix);
  } catch (error) {
    logTaskFailed(subTaskLabel, labelPrefix);
    throw error;
  }
}