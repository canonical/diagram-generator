import ELK from '../../../packages/graph-layout-elk/node_modules/elkjs/lib/elk.bundled.js';

const box = (width, height = 64) => ({ width, height });

function buildGraph(variant) {
  if (variant.mode === 'compound-ports') {
    return buildPortRoutedGraph(variant);
  }

  const rowOrderOptions = variant.enableModelOrder
    ? {
        'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      }
    : {};

  const rowHierarchy = variant.keepRowsSeparate
    ? { 'elk.hierarchyHandling': 'SEPARATE_CHILDREN' }
    : { 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' };

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.spacing.nodeNode': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': '40',
    },
    children: [
      {
        id: 'provider_stack',
        ...box(336, 208),
        layoutOptions: {
          'elk.direction': 'DOWN',
          ...(variant.includeProviderCompound ? { 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' } : {}),
        },
        children: [
          { id: 'vault_charm', ...box(176) },
          { id: 'manual_tls_certificates', ...box(304) },
        ],
      },
      {
        id: 'services_row',
        ...box(1040, 336),
        layoutOptions: {
          'elk.direction': 'RIGHT',
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        },
        children: [
          {
            id: 'openstack_services',
            ...box(448, 208),
            layoutOptions: {
              'elk.direction': 'DOWN',
              ...(variant.includeServiceCompounds ? { 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' } : {}),
            },
            children: [
              {
                id: 'openstack_relation_row',
                ...box(448, 64),
                layoutOptions: {
                  'elk.direction': 'RIGHT',
                  ...rowHierarchy,
                  ...rowOrderOptions,
                },
                children: [
                  { id: 'octavia_certificates', ...box(176) },
                  { id: 'amphora_issuing_ca', ...box(224) },
                  { id: 'amphora_controller_cert', ...box(248) },
                ],
              },
              { id: 'octavia_k8s', ...box(304) },
            ],
          },
          {
            id: 'load_balancers',
            ...box(784, 208),
            layoutOptions: {
              'elk.direction': 'DOWN',
              ...(variant.includeServiceCompounds ? { 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' } : {}),
            },
            children: [
              {
                id: 'load_balancer_relation_row',
                ...box(616, 64),
                layoutOptions: {
                  'elk.direction': 'RIGHT',
                  ...rowHierarchy,
                  ...rowOrderOptions,
                },
                children: [
                  { id: 'public_certificates', ...box(184) },
                  { id: 'internal_certificates', ...box(184) },
                  { id: 'rgw_certificates', ...box(184) },
                ],
              },
              {
                id: 'load_balancer_endpoint_row',
                ...box(752, 64),
                layoutOptions: {
                  'elk.direction': 'RIGHT',
                  ...rowHierarchy,
                  ...rowOrderOptions,
                },
                children: [
                  { id: 'traefik_public', ...box(240) },
                  { id: 'traefik_internal', ...box(240) },
                  { id: 'traefik_rgw', ...box(240) },
                ],
              },
            ],
          },
        ],
      },
    ],
    edges: [
      { id: 'vault->manual', sources: ['vault_charm'], targets: ['manual_tls_certificates'] },
      { id: 'manual->octavia', sources: ['manual_tls_certificates'], targets: ['octavia_k8s'] },
      { id: 'manual->public', sources: ['manual_tls_certificates'], targets: ['traefik_public'] },
      { id: 'manual->internal', sources: ['manual_tls_certificates'], targets: ['traefik_internal'] },
      { id: 'manual->rgw', sources: ['manual_tls_certificates'], targets: ['traefik_rgw'] },
    ],
  };
}

function port(id, side, index, x, y) {
  return {
    id,
    width: 12,
    height: 12,
    x,
    y,
    layoutOptions: {
      'org.eclipse.elk.port.side': side,
      ...(typeof index === 'number' ? { 'org.eclipse.elk.port.index': String(index) } : {}),
    },
  };
}

function parentOrderOptions(variant) {
  const mode = variant.compoundOrderMode
    ?? (variant.enableCompoundModelOrder ? 'full' : 'none');

  switch (mode) {
    case 'none':
      return {};
    case 'strategy':
      return {
        'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      };
    case 'strategy+force':
      return {
        'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      };
    case 'strategy+port':
      return {
        'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'org.eclipse.elk.layered.considerModelOrder.portModelOrder': 'true',
      };
    case 'full':
      return {
        'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
        'org.eclipse.elk.layered.considerModelOrder.portModelOrder': 'true',
      };
    default:
      throw new Error(`Unknown compoundOrderMode: ${mode}`);
  }
}

function buildPortRoutedGraph(variant) {
  const rowOrderOptions = variant.disableRowModelOrder
    ? {}
    : {
        'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      };
  const compoundOrderOptions = parentOrderOptions(variant);
  const compoundTargets = new Set(
    variant.compoundOrderTargets
      ?? ['provider_stack', 'services_row', 'openstack_services', 'load_balancers'],
  );
  const optionsForCompound = (id) => (compoundTargets.has(id) ? compoundOrderOptions : {});
  const edgeContainer = variant.explicitContainers ? { container: 'root' } : {};
  const providerEdgeContainer = variant.explicitContainers ? { container: 'provider_stack' } : {};
  const openstackEdgeContainer = variant.explicitContainers ? { container: 'openstack_services' } : {};
  const loadBalancerEdgeContainer = variant.explicitContainers ? { container: 'load_balancers' } : {};
  const endpointRowEdgeContainer = variant.explicitContainers ? { container: 'load_balancer_endpoint_row' } : {};

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.mergeHierarchyEdges': 'true',
      'elk.spacing.nodeNode': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': '40',
    },
    children: [
      {
        id: 'provider_stack',
        ...box(336, 208),
        layoutOptions: {
          'elk.direction': 'DOWN',
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
          'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
          ...optionsForCompound('provider_stack'),
        },
        ports: [port('provider_stack__out', 'SOUTH', 0, 156, 208)],
        children: [
          { id: 'vault_charm', ...box(176) },
          { id: 'manual_tls_certificates', ...box(304) },
        ],
        edges: [
          { id: 'vault->manual', ...providerEdgeContainer, sources: ['vault_charm'], targets: ['manual_tls_certificates'] },
          {
            id: 'manual->provider-out',
            ...providerEdgeContainer,
            sources: ['manual_tls_certificates'],
            targets: ['provider_stack__out'],
          },
        ],
      },
      {
        id: 'services_row',
        ...box(1040, 336),
        layoutOptions: {
          'elk.direction': 'RIGHT',
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
          ...optionsForCompound('services_row'),
        },
        children: [
          {
            id: 'openstack_services',
            ...box(448, 208),
            layoutOptions: {
              'elk.direction': 'DOWN',
              'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
              'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
              ...optionsForCompound('openstack_services'),
            },
            ports: [port('openstack_services__in', 'NORTH', 0, 148, 0)],
            children: [
              {
                id: 'openstack_relation_row',
                ...box(448, 64),
                layoutOptions: {
                  'elk.direction': 'RIGHT',
                  'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
                  ...rowOrderOptions,
                },
                children: [
                  { id: 'octavia_certificates', ...box(176) },
                  { id: 'amphora_issuing_ca', ...box(224) },
                  { id: 'amphora_controller_cert', ...box(248) },
                ],
              },
              { id: 'octavia_k8s', ...box(304) },
            ],
            edges: [
              {
                id: 'openstack-in->octavia',
                ...openstackEdgeContainer,
                sources: ['openstack_services__in'],
                targets: ['octavia_k8s'],
              },
            ],
          },
          {
            id: 'load_balancers',
            ...box(784, 208),
            layoutOptions: {
              'elk.direction': 'DOWN',
              'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
              'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
              ...optionsForCompound('load_balancers'),
            },
            ports: [
              port('load_balancers__public_in', 'NORTH', 0, 160, 0),
              port('load_balancers__internal_in', 'NORTH', 1, 388, 0),
              port('load_balancers__rgw_in', 'NORTH', 2, 616, 0),
            ],
            children: [
              {
                id: 'load_balancer_relation_row',
                ...box(616, 64),
                layoutOptions: {
                  'elk.direction': 'RIGHT',
                  'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
                  ...rowOrderOptions,
                },
                children: [
                  { id: 'public_certificates', ...box(184) },
                  { id: 'internal_certificates', ...box(184) },
                  { id: 'rgw_certificates', ...box(184) },
                ],
              },
              {
                id: 'load_balancer_endpoint_row',
                ...box(752, 64),
                layoutOptions: {
                  'elk.direction': 'RIGHT',
                  'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
                  'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
                  ...rowOrderOptions,
                },
                ...(variant.useEndpointRowPorts
                  ? {
                      ports: [
                        port('load_balancer_endpoint_row__public_in', 'NORTH', 0, 120, 0),
                        port('load_balancer_endpoint_row__internal_in', 'NORTH', 1, 376, 0),
                        port('load_balancer_endpoint_row__rgw_in', 'NORTH', 2, 632, 0),
                      ],
                      edges: [
                        {
                          id: 'endpoint-row-public-in->public',
                          ...endpointRowEdgeContainer,
                          sources: ['load_balancer_endpoint_row__public_in'],
                          targets: ['traefik_public'],
                        },
                        {
                          id: 'endpoint-row-internal-in->internal',
                          ...endpointRowEdgeContainer,
                          sources: ['load_balancer_endpoint_row__internal_in'],
                          targets: ['traefik_internal'],
                        },
                        {
                          id: 'endpoint-row-rgw-in->rgw',
                          ...endpointRowEdgeContainer,
                          sources: ['load_balancer_endpoint_row__rgw_in'],
                          targets: ['traefik_rgw'],
                        },
                      ],
                    }
                  : {}),
                children: [
                  { id: 'traefik_public', ...box(240) },
                  { id: 'traefik_internal', ...box(240) },
                  { id: 'traefik_rgw', ...box(240) },
                ],
              },
            ],
            edges: [
              {
                id: 'lb-public-in->public',
                ...loadBalancerEdgeContainer,
                sources: ['load_balancers__public_in'],
                targets: [variant.useEndpointRowPorts ? 'load_balancer_endpoint_row__public_in' : 'traefik_public'],
              },
              {
                id: 'lb-internal-in->internal',
                ...loadBalancerEdgeContainer,
                sources: ['load_balancers__internal_in'],
                targets: [variant.useEndpointRowPorts ? 'load_balancer_endpoint_row__internal_in' : 'traefik_internal'],
              },
              {
                id: 'lb-rgw-in->rgw',
                ...loadBalancerEdgeContainer,
                sources: ['load_balancers__rgw_in'],
                targets: [variant.useEndpointRowPorts ? 'load_balancer_endpoint_row__rgw_in' : 'traefik_rgw'],
              },
            ],
          },
        ],
      },
    ],
    edges: [
      {
        id: 'provider-out->openstack-in',
        ...edgeContainer,
        sources: ['provider_stack__out'],
        targets: ['openstack_services__in'],
      },
      {
        id: 'provider-out->lb-public-in',
        ...edgeContainer,
        sources: ['provider_stack__out'],
        targets: ['load_balancers__public_in'],
      },
      {
        id: 'provider-out->lb-internal-in',
        ...edgeContainer,
        sources: ['provider_stack__out'],
        targets: ['load_balancers__internal_in'],
      },
      {
        id: 'provider-out->lb-rgw-in',
        ...edgeContainer,
        sources: ['provider_stack__out'],
        targets: ['load_balancers__rgw_in'],
      },
    ],
  };
}

function findNode(node, id) {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

function summarizeLayout(root) {
  const endpointRow = findNode(root, 'load_balancer_endpoint_row');
  const certRow = findNode(root, 'openstack_relation_row');
  const octavia = findNode(root, 'octavia_k8s');
  const endpointOrder = (endpointRow?.children ?? [])
    .slice()
    .sort((left, right) => left.x - right.x)
    .map((node) => node.id);

  return {
    endpointOrder,
    certRowAboveOctavia: certRow && octavia ? certRow.y < octavia.y : null,
    certRowY: certRow?.y ?? null,
    octaviaY: octavia?.y ?? null,
  };
}

const variants = [
  {
    id: 'baseline',
    includeProviderCompound: false,
    includeServiceCompounds: false,
    keepRowsSeparate: true,
    enableModelOrder: false,
  },
  {
    id: 'row-model-order',
    includeProviderCompound: false,
    includeServiceCompounds: false,
    keepRowsSeparate: true,
    enableModelOrder: true,
  },
  {
    id: 'all-compounds-include-children',
    includeProviderCompound: true,
    includeServiceCompounds: true,
    keepRowsSeparate: true,
    enableModelOrder: true,
  },
  {
    id: 'flatten-order-rows',
    includeProviderCompound: true,
    includeServiceCompounds: true,
    keepRowsSeparate: false,
    enableModelOrder: true,
  },
  {
    id: 'compound-ports-nested-edges',
    mode: 'compound-ports',
    enableCompoundModelOrder: false,
    explicitContainers: false,
    useEndpointRowPorts: false,
  },
  {
    id: 'compound-ports-compound-order',
    mode: 'compound-ports',
    enableCompoundModelOrder: true,
    explicitContainers: false,
    useEndpointRowPorts: false,
  },
  {
    id: 'compound-ports-compound-order-containers',
    mode: 'compound-ports',
    enableCompoundModelOrder: true,
    explicitContainers: true,
    useEndpointRowPorts: false,
  },
  {
    id: 'compound-ports-row-ports',
    mode: 'compound-ports',
    compoundOrderMode: 'full',
    explicitContainers: false,
    useEndpointRowPorts: true,
    disableRowModelOrder: false,
  },
  {
    id: 'compound-ports-row-ports-containers',
    mode: 'compound-ports',
    compoundOrderMode: 'full',
    explicitContainers: true,
    useEndpointRowPorts: true,
    disableRowModelOrder: false,
  },
  {
    id: 'compound-ports-row-ports-no-compound-order',
    mode: 'compound-ports',
    compoundOrderMode: 'none',
    explicitContainers: false,
    useEndpointRowPorts: true,
    disableRowModelOrder: false,
  },
  {
    id: 'compound-ports-row-ports-no-model-order',
    mode: 'compound-ports',
    compoundOrderMode: 'none',
    explicitContainers: false,
    useEndpointRowPorts: true,
    disableRowModelOrder: true,
  },
  {
    id: 'compound-ports-row-ports-compound-strategy',
    mode: 'compound-ports',
    compoundOrderMode: 'strategy',
    explicitContainers: false,
    useEndpointRowPorts: true,
    disableRowModelOrder: false,
  },
  {
    id: 'compound-ports-row-ports-compound-strategy-force',
    mode: 'compound-ports',
    compoundOrderMode: 'strategy+force',
    explicitContainers: false,
    useEndpointRowPorts: true,
    disableRowModelOrder: false,
  },
  {
    id: 'compound-ports-row-ports-compound-strategy-port',
    mode: 'compound-ports',
    compoundOrderMode: 'strategy+port',
    explicitContainers: false,
    useEndpointRowPorts: true,
    disableRowModelOrder: false,
  },
  {
    id: 'compound-ports-row-ports-openstack-strategy-only',
    mode: 'compound-ports',
    compoundOrderMode: 'strategy',
    compoundOrderTargets: ['openstack_services'],
    explicitContainers: false,
    useEndpointRowPorts: true,
    disableRowModelOrder: false,
  },
];

const elk = new ELK();
const results = [];

for (const variant of variants) {
  try {
    const layout = await elk.layout(buildGraph(variant));
    results.push({
      variant: variant.id,
      ok: true,
      summary: summarizeLayout(layout),
    });
  } catch (error) {
    results.push({
      variant: variant.id,
      ok: false,
      error: {
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
        stack: String(error?.stack ?? '')
          .split('\n')
          .slice(0, 6),
      },
    });
  }
}

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
