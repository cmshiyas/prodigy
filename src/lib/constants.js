export const ADMIN_EMAIL = 'cmshiyas007@gmail.com'

export const QUESTION_LIMITS = {
  admin:    999999,
  platinum: 999999,
  gold:     40,
  silver:   10,
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
    {
      id: 'writing', name: 'Writing', icon: '✍️', color: '#4C51BF', bg: '#EEF2FF', desc: 'Writing tasks, clarity, structure, grammar',
      subtopics: ['Text structure', 'Sentence variety', 'Punctuation', 'Tone & purpose']
    },
    {
      id: 'reading', name: 'Reading', icon: '📖', color: '#047857', bg: '#ECFDF3', desc: 'Comprehension, inference, passage analysis',
      subtopics: ['Main idea', 'Inference', 'Vocabulary', 'Text evidence']
    },
    {
      id: 'conventions', name: 'Conventions of Language', icon: '📝', color: '#B45309', bg: '#FFFAEB', desc: 'Spelling, grammar, punctuation',
      subtopics: ['Spelling rules', 'Grammar usage', 'Punctuation', 'Sentence correctness']
    },
    {
      id: 'numeracy', name: 'Numeracy', icon: '🔢', color: '#1D4ED8', bg: '#EFF6FF', desc: 'Number sense, arithmetic, problem solving',
      subtopics: ['Number operations', 'Word problems', 'Data & graphs', 'Measurement']
    },
  ],
  OC: [
    {
      id: 'reading', name: 'Reading', icon: '📘', color: '#4A90D9', bg: '#EFF6FF', desc: 'Short passages, inference, comprehension',
      subtopics: ['Inference', 'Main idea', 'Vocabulary', 'Comparison']
    },
    {
      id: 'mathematical', name: 'Mathematical Reasoning', icon: '📐', color: '#0F9B8E', bg: '#F0FDFA', desc: 'Algebra, operations, quantitative reasoning',
      subtopics: ['Arithmetic', 'Algebraic thinking', 'Number patterns', 'Problem solving']
    },
    {
      id: 'thinking', name: 'Thinking Skills', icon: '🧩', color: '#8B5CF6', bg: '#F5F3FF', desc: 'Logic puzzles, pattern recognition, critical thinking',
      subtopics: ['Sequences', 'Spatial reasoning', 'Logic puzzles', 'Reasoning']
    },
  ],
  Selective: [
    {
      id: 'reading', name: 'Reading', icon: '📘', color: '#4A90D9', bg: '#EFF6FF', desc: 'Comprehension, inference, passage analysis',
      subtopics: ['Inference', 'Summary', 'Vocabulary', 'Opinion']
    },
    {
      id: 'mathematical', name: 'Mathematical Reasoning', icon: '📐', color: '#0F9B8E', bg: '#F0FDFA', desc: 'Algebra, arithmetic, equations',
      subtopics: ['Algebra', 'Fractions', 'Ratios', 'Word problems']
    },
    {
      id: 'thinking', name: 'Thinking Skills', icon: '🧩', color: '#8B5CF6', bg: '#F5F3FF', desc: 'Analytical reasoning, sequences, logic',
      subtopics: ['Patterns', 'Sequences', 'Logic', 'Problem solving']
    },
    {
      id: 'writing', name: 'Writing Test', icon: '✍️', color: '#B45309', bg: '#FFFAEB', desc: 'Sentence construction, expression, planning',
      subtopics: ['Structure', 'Grammar', 'Persuasion', 'Clarity']
    },
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

export const EXAM_YEAR_LEVELS = {
  OC:        [{ value: '4', label: 'Year 4' }],
  NAPLAN:    [{ value: '3', label: 'Year 3' }, { value: '5', label: 'Year 5' }, { value: '7', label: 'Year 7' }, { value: '9', label: 'Year 9' }],
  Selective: [{ value: '6', label: 'Year 6 (Yr 7 entry)' }, { value: '8', label: 'Year 8 (Yr 9 entry)' }],
}
