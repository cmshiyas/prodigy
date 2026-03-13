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

export const EXAM_TOPICS = {
  NAPLAN: [
    { id: 'number',      name: 'Number & Operations',   icon: '🔢', color: '#4A90D9', bg: '#EFF6FF', desc: 'Place value, arithmetic, rounding' },
    { id: 'fractions',   name: 'Fractions & Decimals',  icon: '½',  color: '#7C3AED', bg: '#F5F3FF', desc: 'Fractions, decimals, percentages' },
    { id: 'measurement', name: 'Measurement & Units',   icon: '📏', color: '#0F9B8E', bg: '#F0FDFA', desc: 'Length, mass, time, money' },
    { id: 'data',        name: 'Data & Statistics',      icon: '📊', color: '#52C41A', bg: '#F0FDF4', desc: 'Graphs, tables, probability' },
  ],
  OC: [
    { id: 'number',      name: 'Number & Operations',   icon: '🔢', color: '#4A90D9', bg: '#EFF6FF', desc: 'Place value, arithmetic, order of operations' },
    { id: 'fractions',   name: 'Fractions & Decimals',  icon: '½',  color: '#7C3AED', bg: '#F5F3FF', desc: 'Fractions, decimals, ratio' },
    { id: 'geometry',    name: 'Geometry & Space',       icon: '📐', color: '#FF6B35', bg: '#FFF0E8', desc: 'Shapes, angles, area, volume' },
    { id: 'reasoning',   name: 'Reasoning & Patterns',   icon: '🧩', color: '#8B5CF6', bg: '#F5F3FF', desc: 'Logic, sequences, pattern rules' },
  ],
  Selective: [
    { id: 'number',      name: 'Algebra & Number',       icon: '🔢', color: '#4A90D9', bg: '#EFF6FF', desc: 'Number properties, expressions, equations' },
    { id: 'geometry',    name: 'Spatial Reasoning',      icon: '📐', color: '#FF6B35', bg: '#FFF0E8', desc: '2D/3D visualisation, coordinates' },
    { id: 'reasoning',   name: 'Logical Reasoning',      icon: '🧩', color: '#8B5CF6', bg: '#F5F3FF', desc: 'Critical thinking, patterns, inference' },
    { id: 'data',        name: 'Data Interpretation',    icon: '📊', color: '#52C41A', bg: '#F0FDF4', desc: 'Charts, tables, statistics' },
  ]
}

export const TOPIC_PROMPTS = {
  number:      'Problems on place value, addition/subtraction, multiplication/division, number rules, ordering, and simple algebra expressions.',
  fractions:   'Questions on fractions, decimals, equivalent values, comparisons, conversions, and simple fraction operations.',
  measurement: 'Problems on length, mass, capacity, time, and money with real-world contexts.',
  geometry:    'Questions on 2D and 3D shapes, angles, area, perimeter, symmetry, coordinates, and transformations.',
  patterns:    'Number sequences, patterns, function rules, and missing values in sequences.',
  data:        'Interpreting bar graphs, line graphs, tables, and statistics in real contexts.',
  probability: 'Basic probability language, outcomes, chance comparisons, and simple experiments.',
  reasoning:   'Multi-step word problems, logic puzzles, inference, and spatial reasoning tasks.',
}
