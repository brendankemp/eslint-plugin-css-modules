/* eslint-disable no-param-reassign */
import fp from 'lodash/fp';

import { gASTNode } from '../types';

type classMapType = {
  [key: string]: boolean | string;
}

export const getICSSExportPropsMap = (ast: gASTNode): classMapType => {
  const ruleSets: Array<gASTNode> = [];
  ast.traverseByType('ruleset', (node: gASTNode) => ruleSets.push(node));

  return (fp as any).compose(
    (fp as any).reduce((result: any, key: any) => {
      const prop = (fp as any).compose((fp as any).nth(0), (fp as any).map('content'))(key);
      result[prop] = prop; // e.g. { myProp: 'myProp' }
      return result;
    }, {}),
    (fp as any).map('content'),
    (fp as any).filter({ type: 'property' }),
    (fp as any).flatMap('content'),
    (fp as any).filter({ type: 'declaration' }),
    (fp as any).flatMap('content'),
    (fp as any).filter({ type: 'block' }),
    (fp as any).flatMap('content'),
    (fp as any).filter({
      content: [{
        type: 'selector',
        content: [{
          type: 'pseudoClass',
          content: [{
            type: 'ident', content: 'export'
          }]
        }]
      }]
    })
  )(ruleSets);
};

export const getRegularClassesMap = (ast: gASTNode): classMapType => {
  const ruleSets: Array<gASTNode> = [];
  ast.traverseByType('ruleset', (node: gASTNode) => ruleSets.push(node));

  return (fp as any).compose(
    (fp as any).reduce((result: any, key: any) => {
      result[key] = false; // classes haven't been used
      return result;
    }, {}),
    (fp as any).map('content'),
    (fp as any).filter({ type: 'ident' }),
    (fp as any).flatMap('content'),
    (fp as any).filter({ type: 'class' }),
    (fp as any).flatMap('content'),
    (fp as any).filter({ type: 'selector' }),
    (fp as any).flatMap('content'),
  )(ruleSets);
};

export const getComposesClassesMap = (ast: gASTNode): classMapType => {
  const declarations: any[] = [];
  ast.traverseByType('declaration', (node: gASTNode) => declarations.push(node));

  return (fp as any).compose(
    (fp as any).reduce((result: any, key: any) => {
      result[key] = true; // mark composed classes as true
      return result;
    }, {}),
    (fp as any).flatMap((fp as any).compose(
      (fp as any).map((fp as any).get('content')),
      (fp as any).filter({ type: 'ident' }),
      (fp as any).get('content'),
      (fp as any).find({ type: 'value' }),
      (fp as any).get('content'),
    )),
    /*
       reject classes composing from other files
       eg.
       .foo {
       composes: .bar from './otherFile';
       }
     */
    (fp as any).reject((fp as any).compose(
      (fp as any).find({ type: 'ident', content: 'from' }),
      (fp as any).get('content'),
      (fp as any).find({ type: 'value' }),
      (fp as any).get('content'),
    )),
    (fp as any).filter((fp as any).compose(
      (fp as any).find({ type: 'ident', content: 'composes' }),
      (fp as any).get('content'),
      (fp as any).find({ type: 'property' }),
      (fp as any).get('content'),
    )),
  )(declarations);
};

export const getExtendClassesMap = (ast: gASTNode): classMapType => {
  const extendNodes: any[] = [];
  ast.traverseByType('extend', (node: gASTNode) => extendNodes.push(node));

  return (fp as any).compose(
    (fp as any).reduce((result: any, key: any) => {
      result[key] = true; // mark extend classes as true
      return result;
    }, {}),
    (fp as any).map((fp as any).compose(
      (fp as any).get('content'),
      (fp as any).find({ type: 'ident' }),
      (fp as any).get('content'),
      (fp as any).find({ type: 'class' }),
      (fp as any).get('content'),
      (fp as any).find({ type: 'selector' }),
      (fp as any).get('content'),
    )),
  )(extendNodes);
};

/**
 * Resolves parent selectors to their full class names.
 *
 * E.g. `.foo { &_bar {color: blue } }` to `.foo_bar`.
 */
export const getParentSelectorClassesMap = (ast: gASTNode): classMapType => {
  const classesMap: classMapType = {};

  // Recursively traverses down the tree looking for parent selector
  // extensions. Recursion is necessary as these selectors can be nested.
  const getExtensions = (nodeContent: any): any[] => {
    const blockContent = (fp as any).compose(
      (fp as any).flatMap('content'),
      (fp as any).filter({ type: 'block' })
    )(nodeContent);

    const rulesetsContent = (fp as any).flatMap('content', (fp as any).concat(
      // `ruleset` children
      (fp as any).filter({ type: 'ruleset' }, blockContent),

      // `ruleset` descendants nested in `include` nodes
      (fp as any).compose(
        (fp as any).filter({ type: 'ruleset' }),
        (fp as any).flatMap('content'),
        (fp as any).filter({ type: 'block' }),
        (fp as any).flatMap('content'),
        (fp as any).filter({ type: 'include' })
      )(blockContent)
    ));

    const extensions: any[] = (fp as any).compose(
      (fp as any).map('content'),
      (fp as any).filter({ type: 'ident' }),
      (fp as any).flatMap('content'),
      (fp as any).filter({ type: 'parentSelectorExtension' }),
      (fp as any).flatMap('content'),
      (fp as any).filter({ type: 'selector' })
    )(rulesetsContent);

    if (!extensions.length) return [];

    const nestedExtensions = getExtensions(rulesetsContent);
    const result = extensions;
    if (nestedExtensions.length) {
      nestedExtensions.forEach((nestedExt: any) => {
        extensions.forEach((ext: any) => {
          result.push(ext + nestedExt);
        });
      });
    }

    return result;
  };

  ast.traverseByType('ruleset', (node: gASTNode) => {
    const classNames: any[] = (fp as any).compose(
      (fp as any).map('content'),
      (fp as any).filter({ type: 'ident' }),
      (fp as any).flatMap('content'),
      (fp as any).filter({ type: 'class' }),
      (fp as any).flatMap('content'),
      (fp as any).filter({ type: 'selector' })
    )(node.content);

    if (!classNames.length) return;

    const extensions = getExtensions(node.content);
    if (!extensions.length) return;

    classNames.forEach((className: any) => {
      extensions.forEach((ext: any) => {
        classesMap[className + ext] = false;
      });

      // Ignore the base class if it only exists for nesting parent selectors
      const hasDeclarations = (fp as any).compose(
        (fp as any).filter({ type: 'declaration' }),
        (fp as any).flatMap('content'),
        (fp as any).filter({ type: 'block' })
      )(node.content).length > 0;
      if (!hasDeclarations) classesMap[className] = true;
    });
  });

  return classesMap;
};

/**
 * Mutates the AST by removing `:global` instances.
 *
 * For the AST structure:
 * @see https://github.com/css/gonzales/blob/master/doc/AST.CSSP.en.md
 */
export const eliminateGlobals = (ast: gASTNode) => {
  // Remove all :global/:global(...) in selectors
  ast.traverseByType('selector', (selectorNode: gASTNode) => {
    const selectorContent = selectorNode.content as gASTNode[];
    let hasGlobalWithNoArgs = false;
    let i = 0;
    let currNode = selectorContent[i];
    while (currNode) {
      if (currNode.is('pseudoClass')) {
        // Remove all :global/:global(...) and trailing space
        const identifierNode = (currNode.content as gASTNode[])[0];
        if (identifierNode && identifierNode.content === 'global') {
          if ((currNode.content as gASTNode[]).length === 1) hasGlobalWithNoArgs = true;
          selectorNode.removeChild(i);
          if (selectorContent[i] && selectorContent[i].is('space')) {
            selectorNode.removeChild(i);
          }
        } else {
          i++;
        }
      } else if (currNode.is('class') && hasGlobalWithNoArgs) {
        // Remove all class after :global and their trailing space
        selectorNode.removeChild(i);
        if (selectorContent[i] && selectorContent[i].is('space')) {
          selectorNode.removeChild(i);
        }
      } else {
        i++;
      }

      currNode = selectorContent[i];
    }
  });

  // Remove all ruleset with no selectors
  ast.traverseByType('ruleset', (node: gASTNode, index: number, parent: gASTNode) => {
    const rulesetContent = node.content as gASTNode[];

    // Remove empty selectors and trailing deliminator and space
    let i = 0;
    let currNode = rulesetContent[i];
    while (currNode) {
      if (currNode.is('selector') && (currNode.content as gASTNode[]).length === 0) {
        node.removeChild(i);
        if (rulesetContent[i].is('delimiter')) node.removeChild(i);
        if (rulesetContent[i].is('space')) node.removeChild(i);
      } else {
        i++;
      }
      currNode = rulesetContent[i];
    }

    // Remove the ruleset if no selectors
    if (rulesetContent.filter((n: gASTNode) => n.is('selector')).length === 0) {
      parent.removeChild(index);
    }
  });
};
