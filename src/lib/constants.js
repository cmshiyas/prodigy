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
    { id: 'writing',       name: 'Writing',       icon: '✍️', color: '#4C51BF', bg: '#EEF2FF', desc: 'Writing tasks, clarity, structure, grammar' },
    { id: 'reading',       name: 'Reading',       icon: '📖', color: '#047857', bg: '#ECFDF3', desc: 'Comprehension, inference, passage analysis' },
    { id: 'conventions',   name: 'Conventions of Language', icon: '📝', color: '#B45309', bg: '#FFFAEB', desc: 'Spelling, grammar, punctuation' },
    { id: 'numeracy',      name: 'Numeracy',      icon: '🔢', color: '#1D4ED8', bg: '#EFF6FF', desc: 'Number sense, arithmetic, problem solving' },
  ],
  OC: [
    { id: 'reading',       name: 'Reading Test',             icon: '📘', color: '#4A90D9', bg: '#EFF6FF', desc: 'Short passages, inference, comprehension' },
    { id: 'mathematical',  name: 'Mathematical Reasoning',   icon: '📐', color: '#0F9B8E', bg: '#F0FDFA', desc: 'Algebra, operations, quantitative reasoning' },
    { id: 'thinking',      name: 'Thinking Skills',          icon: '🧩', color: '#8B5CF6', bg: '#F5F3FF', desc: 'Logic puzzles, pattern recognition, critical thinking' },
  ],
  Selective: [
    { id: 'reading',       name: 'Reading Test',             icon: '📘', color: '#4A90D9', bg: '#EFF6FF', desc: 'Comprehension, inference, passage analysis' },
    { id: 'mathematical',  name: 'Mathematical Reasoning',   icon: '📐', color: '#0F9B8E', bg: '#F0FDFA', desc: 'Algebra, arithmetic, equations' },
    { id: 'thinking',      name: 'Thinking Skills',          icon: '🧩', color: '#8B5CF6', bg: '#F5F3FF', desc: 'Analytical reasoning, sequences, logic' },
    { id: 'writing',       name: 'Writing Test',             icon: '✍️', color: '#B45309', bg: '#FFFAEB', desc: 'Sentence construction, expression, planning' },
  ]
}

export const TOPIC_PROMPTS = {
  writing:       'Writing tasks: paragraph structure, sentence clarity, grammar, vocabulary, and persuasive/narrative writing.',
  reading:       'Reading comprehension: passages, main ideas, inference, vocabulary context, and detail questions.',
  conventions:   'Conventions: spelling, punctuation, grammar, sentence correctness, and word usage.',
  numeracy:      'Numeracy: arithmetic, number patterns, data interpretation, basic algebra, and word problems.',
  mathematical:  'Mathematical reasoning: numeric reasoning, algebraic thinking, problem solving, and quantitative logic.',
  thinking:      'Thinking skills: logical puzzles, pattern recognition, deduction, and sequence reasoning.',
  number:        'Problems on place value, addition/subtraction, multiplication/division, number rules, ordering, and simple algebra expressions.',
  fractions:     'Questions on fractions, decimals, equivalent values, comparisons, conversions, and simple fraction operations.',
  measurement:   'Problems on length, mass, capacity, time, and money with real-world contexts.',
  geometry:      'Questions on 2D and 3D shapes, angles, area, perimeter, symmetry, coordinates, and transformations.',
  patterns:      'Number sequences, patterns, function rules, and missing values in sequences.',
  data:          'Interpreting bar graphs, line graphs, tables, and statistics in real contexts.',
  probability:   'Basic probability language, outcomes, chance comparisons, and simple experiments.',
  reasoning:     'Multi-step word problems, logic puzzles, inference, and spatial reasoning tasks.',
}
