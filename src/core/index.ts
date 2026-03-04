import fs from 'fs';
import path from 'path';
import fp from 'lodash/fp';
import _ from 'lodash';
import gonzales from 'gonzales-pe';

import { JsNode, gASTNode } from '../types';

import {
  getRegularClassesMap,
  getComposesClassesMap,
  getExtendClassesMap,
  getParentSelectorClassesMap,
  getICSSExportPropsMap,
  eliminateGlobals,
} from './traversalUtils';

const styleExtensionRegex = /\.(s?css|less)$/;

function dashesCamelCase (str: string): string {
  return str.replace(/-+(\w)/g, function (_match: string, firstLetter: string) {
    return firstLetter.toUpperCase();
  });
}

export const getFilePath = (context: any, styleFilePath: string): string => {
  const settings = context.settings['css-modules'];

  const dirName = path.dirname(context.getFilename());
  const basePath = (settings && settings.basePath) ? settings.basePath : '';
  const aliases: Record<string, string> = (settings && settings.aliases) || {};

  // Check if the import matches any configured alias
  for (const [alias, aliasPath] of Object.entries(aliases)) {
    if (styleFilePath.startsWith(alias)) {
      const resolved = styleFilePath.replace(alias, aliasPath);
      return path.resolve(resolved);
    }
  }

  return styleFilePath.startsWith('.')
    ? path.resolve(dirName, styleFilePath)
    : path.resolve(basePath, styleFilePath);
};

export const getPropertyName = (node: JsNode, ..._args: any[]): string | null => {
  const computed = (node as any).computed;
  const property = (node as any).property;

  const propertyName = computed
    /*
       square braces eg s['header']
       we won't use node.property.name because it is for cases like
       s[abc] where abc is a variable
     */
    ? property.value
    /* dot notation, eg s.header */
    : property.name;

  /*
     skip property names starting with _
     eg. special functions provided
     by css modules like _getCss()

     Tried to just skip function calls, but the parser
     thinks of normal property access like s._getCss and
     function calls like s._getCss() as same.
   */
  if (!propertyName || _.startsWith(propertyName, '_')) {
    return null;
  }

  return propertyName;
};

export const getClassesMap = (classes: Record<string, any>, camelCase: string | boolean): Record<string, string> => {
  const classesMap: Record<string, string> = {};

  // Unroll the loop because of performance!
  // Remember that this function will run on every lint (e.g.: on file save)
  switch (camelCase) {
    case true:
      _.forIn(classes, (_value: any, className: string) => {
        classesMap[className] = className;
        classesMap[_.camelCase(className)] = className;
      });
      break;
    case 'dashes':
      _.forIn(classes, (_value: any, className: string) => {
        classesMap[className] = className;
        classesMap[dashesCamelCase(className)] = className;
      });
      break;
    case 'only':
      _.forIn(classes, (_value: any, className: string) => {
        classesMap[_.camelCase(className)] = className;
      });
      break;
    case 'dashes-only':
      _.forIn(classes, (_value: any, className: string) => {
        classesMap[dashesCamelCase(className)] = className;
      });
      break;
    default:
      _.forIn(classes, (_value: any, className: string) => {
        classesMap[className] = className;
      });
  }

  return classesMap;
};

export const getStyleImportNodeData = (node: JsNode): { importName: string; styleFilePath: string; importNode: any } | undefined => {
  // path from which it was imported
  const styleFilePath = (fp as any).get('source.value')(node);

  if (styleFilePath && styleExtensionRegex.test(styleFilePath)) {
    const importNode = (fp as any).compose(
      (fp as any).find({ type: 'ImportDefaultSpecifier' }),
      (fp as any).get('specifiers'),
    )(node);

    // the default imported name
    const importName = (fp as any).get('local.name')(importNode);

    if (importName) { // it had a default import
      return { importName, styleFilePath, importNode };
    }
  }

  return undefined;
};

export const fileExists = (filePath: string): boolean => {
  try {
    // check if file exists
    fs.statSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * @returns AST of the parsed file or null if parse failed
 */
export const getAST = (filePath: string): gASTNode | null => {
  const fileContent = fs.readFileSync(filePath);

  const syntax = path.extname(filePath).slice(1); // remove leading .

  try {
    return gonzales.parse(fileContent.toString(), { syntax });
  } catch (e) {
    return null;
  }
};

export const getStyleClasses = (ast: gASTNode): Record<string, any> => {
  /*
     mutates ast by removing :global scopes
   */
  eliminateGlobals(ast);

  const classesMap = getRegularClassesMap(ast);
  const composedClassesMap = getComposesClassesMap(ast);
  const extendClassesMap = getExtendClassesMap(ast);
  const parentSelectorClassesMap = getParentSelectorClassesMap(ast);

  return {
    ...classesMap,
    ...composedClassesMap,
    ...extendClassesMap,
    ...parentSelectorClassesMap
  };
};

export const getExportPropsMap = (ast: gASTNode): Record<string, any> => {
  const exportPropsMap = getICSSExportPropsMap(ast);
  return {
    ...exportPropsMap
  };
};
