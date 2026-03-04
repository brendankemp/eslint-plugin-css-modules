// JS AST Node (Babel/ESLint)
export interface Position {
  line: number;   // 1 indexed
  column: number; // 0 indexed
}

export interface SourceLocation {
  start: Position;
  end: Position;
  identifierName?: string;
}

export interface JsNode {
  type: string;
  start: number;
  end: number;
  loc: JsNode;
  local?: JsNode;
  name?: string;
  value?: string;
  specifiers?: Array<JsNode>;
  importKind?: 'value';
  extra?: {
    rawValue: string;
    raw: string;
  };
  source: JsNode;
  range: Array<number>;
  _babelType: string;
  parent: JsNode;
  computed?: boolean;
  property?: JsNode;
  object?: JsNode;
  [key: string]: any;
}

// gonzales AST Node Type
export interface gASTNode {
  traverseByType: (type: string, callback: (node: gASTNode, index: number, parent: gASTNode) => void) => void;
  removeChild: (index: number) => void;
  is: (type: string) => boolean;

  type: string;
  content: string | Array<gASTNode>;
  syntax: 'css' | 'scss' | 'less';
  length?: number;
}
