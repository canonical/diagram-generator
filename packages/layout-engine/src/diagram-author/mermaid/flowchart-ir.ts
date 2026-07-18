export type MermaidFlowDirection = 'TB' | 'TD' | 'LR' | 'RL' | 'BT';

export type MermaidNodeShape =
  | 'rectangle'
  | 'round'
  | 'diamond'
  | 'circle'
  | 'stadium'
  | 'subroutine'
  | 'cylinder'
  | 'hexagon'
  | 'flag'
  | 'attribute';

export interface IrNode {
  readonly id: string;
  readonly label?: string;
  readonly shape?: MermaidNodeShape;
  readonly classes: readonly string[];
  readonly containerPath: readonly string[];
  readonly explicit: boolean;
  readonly markdown?: boolean;
  readonly html?: boolean;
  readonly line: number;
}

export interface IrEdge {
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly connector: '-->' | '<-->' | '---' | '==>' | '-.->';
  readonly line: number;
}

export interface IrContainer {
  readonly id: string;
  readonly heading?: string;
  direction?: MermaidFlowDirection;
  readonly classes: readonly string[];
  readonly line: number;
  readonly children: IrContainer[];
}

export interface IrStyleStatement {
  readonly kind: 'classDef' | 'class' | 'style';
  readonly names: readonly string[];
  readonly className?: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly line: number;
}

export interface IrUnsupportedStatement {
  readonly raw: string;
  readonly line: number;
  readonly kind: 'style' | 'edge-id' | 'syntax';
}

export interface IrFlowchart {
  readonly direction: MermaidFlowDirection;
  readonly title?: string;
  readonly nodes: IrNode[];
  readonly roots: IrContainer[];
  readonly edges: IrEdge[];
  readonly styles: IrStyleStatement[];
  readonly unsupported: IrUnsupportedStatement[];
}
