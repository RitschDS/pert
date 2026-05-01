import { DEFAULT_NODE_W, DEFAULT_NODE_H } from '../utils/constants';

// No yOffset/xOffset — those are computed from height/width arrays via computeLaneOffsets/computePhaseOffsets
export const INITIAL_LANES = [
  { id: 'de',   label: 'Data Engineering', height: 160, color: 'rgba(96,165,250,0.05)' },
  { id: 'sm',   label: 'Semantic Model',   height: 160, color: 'rgba(148,163,184,0.05)' },
  { id: 'arch', label: 'Architecture',     height: 160, color: 'rgba(96,165,250,0.05)' },
  { id: 'cm',   label: 'Cost Management',  height: 160, color: 'rgba(148,163,184,0.05)' },
];

export const INITIAL_PHASES = [
  { id: 'discovery', label: 'Discovery', width: 300, color: 'rgba(251,191,36,0.04)' },
  { id: 'build',     label: 'Build',     width: 360, color: 'rgba(251,146,60,0.04)' },
  { id: 'test',      label: 'Test',      width: 280, color: 'rgba(167,243,208,0.04)' },
  { id: 'deploy',    label: 'Deploy',    width: 240, color: 'rgba(196,181,253,0.04)' },
];

const W = DEFAULT_NODE_W;
const H = DEFAULT_NODE_H;

export const INITIAL_NODES = [
  { id: 'n1', label: 'Source Audit',         duration: 3, assignee: 'Alice', laneId: 'de',   status: 'Complete',    x: 40,  y: 24,  w: W, h: H },
  { id: 'n2', label: 'Data Model Design',    duration: 5, assignee: 'Bob',   laneId: 'sm',   status: 'Complete',    x: 40,  y: 184, w: W, h: H },
  { id: 'n3', label: 'Infra Provisioning',   duration: 4, assignee: 'Carol', laneId: 'arch', status: 'In Progress', x: 40,  y: 344, w: W, h: H },
  { id: 'n4', label: 'Pipeline Build',       duration: 8, assignee: 'Alice', laneId: 'de',   status: 'In Progress', x: 380, y: 24,  w: W, h: H },
  { id: 'n5', label: 'Semantic Layer',       duration: 6, assignee: 'Bob',   laneId: 'sm',   status: 'Not Started', x: 380, y: 184, w: W, h: H },
  { id: 'n6', label: 'Cost Tagging Strategy',duration: 3, assignee: 'Dana',  laneId: 'cm',   status: 'Not Started', x: 40,  y: 504, w: W, h: H },
  { id: 'n7', label: 'Integration Test',     duration: 5, assignee: 'Carol', laneId: 'arch', status: 'Not Started', x: 740, y: 184, w: W, h: H },
  { id: 'n8', label: 'Production Deploy',    duration: 2, assignee: 'Alice', laneId: 'de',   status: 'Not Started', x: 1040, y: 104, w: W, h: H },
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
