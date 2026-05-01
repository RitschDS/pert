export const LANES = [
  { id: 'de',   label: 'Data Engineering', yOffset: 0,   height: 180, color: 'rgba(96,165,250,0.05)' },
  { id: 'sm',   label: 'Semantic Model',   yOffset: 180, height: 180, color: 'rgba(148,163,184,0.05)' },
  { id: 'arch', label: 'Architecture',     yOffset: 360, height: 180, color: 'rgba(96,165,250,0.05)' },
  { id: 'cm',   label: 'Cost Management',  yOffset: 540, height: 180, color: 'rgba(148,163,184,0.05)' },
];

export const PHASES = [
  { id: 'discovery', label: 'Discovery', xOffset: 0,    width: 360, color: 'rgba(251,191,36,0.04)' },
  { id: 'build',     label: 'Build',     xOffset: 360,  width: 400, color: 'rgba(251,146,60,0.04)' },
  { id: 'test',      label: 'Test',      xOffset: 760,  width: 300, color: 'rgba(167,243,208,0.04)' },
  { id: 'deploy',    label: 'Deploy',    xOffset: 1060, width: 260, color: 'rgba(196,181,253,0.04)' },
];

export const INITIAL_NODES = [
  {
    id: 'n1', label: 'Source Audit', duration: 3, assignee: 'Alice',
    laneId: 'de', status: 'Complete', x: 60, y: 30,
  },
  {
    id: 'n2', label: 'Data Model Design', duration: 5, assignee: 'Bob',
    laneId: 'sm', status: 'Complete', x: 60, y: 210,
  },
  {
    id: 'n3', label: 'Infra Provisioning', duration: 4, assignee: 'Carol',
    laneId: 'arch', status: 'In Progress', x: 60, y: 390,
  },
  {
    id: 'n4', label: 'Pipeline Build', duration: 8, assignee: 'Alice',
    laneId: 'de', status: 'In Progress', x: 440, y: 30,
  },
  {
    id: 'n5', label: 'Semantic Layer', duration: 6, assignee: 'Bob',
    laneId: 'sm', status: 'Not Started', x: 440, y: 210,
  },
  {
    id: 'n6', label: 'Cost Tagging Strategy', duration: 3, assignee: 'Dana',
    laneId: 'cm', status: 'Not Started', x: 60, y: 570,
  },
  {
    id: 'n7', label: 'Integration Test', duration: 5, assignee: 'Carol',
    laneId: 'arch', status: 'Not Started', x: 840, y: 210,
  },
  {
    id: 'n8', label: 'Production Deploy', duration: 2, assignee: 'Alice',
    laneId: 'de', status: 'Not Started', x: 1120, y: 120,
  },
];

export const INITIAL_EDGES = [
  { id: 'e1', from: 'n1', to: 'n4' },
  { id: 'e2', from: 'n2', to: 'n5' },
  { id: 'e3', from: 'n3', to: 'n4' },
  { id: 'e4', from: 'n4', to: 'n7' },
  { id: 'e5', from: 'n5', to: 'n7' },
  { id: 'e6', from: 'n6', to: 'n7' },
  { id: 'e7', from: 'n7', to: 'n8' },
];
