import * as t from '@babel/types';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import { addNamed } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import tranformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';
import { JSX_HELPER_KEY } from './utils';

export type State = {
  get: (name: string) => any;
  set: (name: string, value: any) => any;
  opts: Opts;
}

export interface Opts {
  transformOn?: boolean;
  optimize?: boolean;
  mergeProps?: boolean;
  isCustomElement?: (tag: string) => boolean;
}

export type ExcludesBoolean = <T>(x: T | false | true) => x is T;

const hasJSX = (parentPath: NodePath) => {
  let fileHasJSX = false;
  parentPath.traverse({
    JSXElement(path) { // skip ts error
      fileHasJSX = true;
      path.stop();
    },
    JSXFragment(path) {
      fileHasJSX = true;
      path.stop();
    },
  });

  return fileHasJSX;
};

export default () => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    Program: {
      enter(path: NodePath, state: State) {
        if (hasJSX(path)) {
          state.set(JSX_HELPER_KEY, new Set<string>());
          const importMap: Record<string, string> = {};
          state.set('@vue/babel-plugin-jsx/rumtimeIsSlot', () => {
            if (importMap.isSlot) {
              return t.identifier(importMap.isSlot);
            }
            const identifier = addNamed(path, 'isSlot', '@vue/babel-plugin-jsx/dist/rumtime');
            importMap.isSlot = identifier.name;
            return identifier;
          });
        }
      },
      exit(path: NodePath<t.Program>, state: State) {
        const helpers: Set<string> = state.get(JSX_HELPER_KEY);
        if (!helpers?.size) {
          return;
        }

        const body = path.get('body');
        const specifierNames = new Set<string>();
        body
          .filter((nodePath) => t.isImportDeclaration(nodePath.node)
            && nodePath.node.source.value === 'vue')
          .forEach((nodePath) => {
            let shouldKeep = false;
            const newSpecifiers = (nodePath.node as t.ImportDeclaration).specifiers
              .filter((specifier) => {
                if (t.isImportSpecifier(specifier)) {
                  const { imported, local } = specifier;
                  if (local.name === imported.name) {
                    specifierNames.add(imported.name);
                    return false;
                  }
                  return true;
                }
                if (t.isImportNamespaceSpecifier(specifier)) {
                  // should keep when `import * as Vue from 'vue'`
                  shouldKeep = true;
                }
                return false;
              });

            if (newSpecifiers.length) {
              nodePath.replaceWith(t.importDeclaration(newSpecifiers, t.stringLiteral('vue')));
            } else if (!shouldKeep) {
              nodePath.remove();
            }
          });

        const importedHelperKeys = new Set([...specifierNames, ...helpers]);
        const specifiers: t.ImportSpecifier[] = [...importedHelperKeys].map(
          (imported) => t.importSpecifier(
            t.identifier(imported), t.identifier(imported),
          ),
        );
        const expression = t.importDeclaration(specifiers, t.stringLiteral('vue'));
        path.unshiftContainer('body', expression);
      },
    },
    ...tranformVueJSX(),
    ...sugarFragment(),
  },
});
