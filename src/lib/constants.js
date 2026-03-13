export const ADMIN_EMAIL = 'cmshiyas007@gmail.com'

export const TOKEN_LIMITS = {
  admin:    999999,
  platinum: 50000,
  gold:     20000,
  silver:   5000,
}

export const TIER_LABELS = {
  silver: 'Silver', gold: 'Gold', platinum: 'Platinum', admin: 'Admin',
}

export const TIER_CLASSES = {
  silver: 'tier-silver', gold: 'tier-gold', platinum: 'tier-platinum', admin: 'tier-admin',
}

export const EXAM_TYPES = [
  { id: 'NAPLAN', label: 'NAPLAN' },
  { id: 'OC', label: 'OC' },
  { id: 'Selective', label: 'Selective' },
]

export const TOPICS = [
  { id: 'number',      name: 'Number & Operations',   icon: '🔢', color: '#4A90D9', bg: '#EFF6FF', desc: 'Place value, arithmetic, ordering, rounding' },
  { id: 'fractions',   name: 'Fractions & Decimals',  icon: '½',  color: '#7C3AED', bg: '#F5F3FF', desc: 'Fractions, mixed numbers, comparing' },
  { id: 'measurement', name: 'Measurement & Units',   icon: '📏', color: '#0F9B8E', bg: '#F0FDFA', desc: 'Length, mass, volume, time, money' },
  { id: 'geometry',    name: 'Geometry & Space',       icon: '📐', color: '#FF6B35', bg: '#FFF0E8', desc: 'Shapes, angles, area, perimeter, symmetry' },
  { id: 'patterns',    name: 'Patterns & Algebra',     icon: '🔁', color: '#F59E0B', bg: '#FFFBEB', desc: 'Number patterns, sequences, rules' },
  { id: 'data',        name: 'Data & Statistics',      icon: '📊', color: '#52C41A', bg: '#F0FDF4', desc: 'Graphs, tables, interpreting data' },
  { id: 'probability', name: 'Chance & Probability',   icon: '🎲', color: '#EF4444', bg: '#FEF2F2', desc: 'Likelihood, possible outcomes' },
  { id: 'reasoning',   name: 'Logical Reasoning',      icon: '🧩', color: '#8B5CF6', bg: '#F5F3FF', desc: 'Word problems, multi-step, spatial' },
]

export const TOPIC_PROMPTS = {
  number:      'Place value, addition/subtraction up to 100000, multiplication/division, ordering numbers, rounding. Use real-world contexts.',
  fractions:   'Identifying fractions, equivalent fractions, comparing fractions, simple mixed numbers, fractions of quantities.',
  measurement: 'Length (cm/m/km), mass (g/kg), volume (mL/L), time (reading clocks, duration, calendars), money (Australian dollars/cents).',
  geometry:    '2D shapes (properties), 3D objects, area, perimeter, angles (right/acute/obtuse), symmetry, transformations, coordinate grids.',
  patterns:    'Number sequences (finding rules, next terms), number patterns, missing numbers in equations, function machines.',
  data:        'Reading bar graphs, picture graphs, tally charts, line graphs. Calculating totals, differences from graphs.',
  probability: 'Likelihood language (certain/likely/unlikely/impossible), equally likely events, comparing probabilities.',
  reasoning:   'Multi-step word problems, spatial reasoning, 3D visualisation, logic puzzles, working backwards.',
}
