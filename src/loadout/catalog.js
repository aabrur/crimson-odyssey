export const BUILTIN_SKILLS = [
  {
    id: 'crimson-core',
    name: 'Crimson Core',
    version: '0.2.0',
    source: 'builtin',
    slots: ['weapon'],
    description: 'General reasoning, planning, execution, and verification.',
    trigger: ['general', 'plan', 'execute', 'verify'],
    permissions: [],
    contextCost: 'medium',
    instructions: 'Operate as a practical generalist. Clarify only when ambiguity blocks safe progress. Plan, execute, test, and report evidence.'
  },
  {
    id: 'production-guard',
    name: 'Production Guard',
    version: '0.2.0',
    source: 'builtin',
    slots: ['armor'],
    description: 'Security, evidence, regression, and completion guardrails.',
    trigger: ['always'],
    permissions: [],
    contextCost: 'low',
    instructions: 'Never claim completion without evidence. Protect secrets. Respect workspace boundaries. Reject hidden fallback and destructive actions without approval.'
  },
  {
    id: 'software-engineer',
    name: 'Senior Software Engineer',
    version: '0.2.0',
    source: 'builtin',
    slots: ['weapon', 'accessory', 'magic'],
    description: 'Architecture, debugging, implementation, refactoring, and tests.',
    trigger: ['code', 'bug', 'repo', 'test', 'architecture', 'refactor', 'npm', 'python'],
    permissions: ['filesystem', 'process'],
    contextCost: 'high',
    instructions: 'Inspect before editing. Prefer minimal coherent changes. Add regression tests. Run focused verification before the full suite.'
  },
  {
    id: 'deep-research',
    name: 'Deep Research',
    version: '0.2.0',
    source: 'builtin',
    slots: ['accessory', 'magic'],
    description: 'Source-led research, comparison, synthesis, and uncertainty tracking.',
    trigger: ['research', 'compare', 'latest', 'source', 'evidence', 'market'],
    permissions: ['network'],
    contextCost: 'high',
    instructions: 'Use authoritative sources, separate facts from inference, cite load-bearing claims, and surface uncertainty.'
  },
  {
    id: 'creative-director',
    name: 'Creative Director',
    version: '0.2.0',
    source: 'builtin',
    slots: ['weapon', 'accessory', 'magic'],
    description: 'Concept direction, visual systems, campaigns, and production prompts.',
    trigger: ['creative', 'design', 'brand', 'image', 'video', 'campaign', 'visual'],
    permissions: [],
    contextCost: 'medium',
    instructions: 'Turn objectives into distinct art direction, production constraints, and usable deliverables. Avoid generic AI aesthetics.'
  },
  {
    id: 'business-strategist',
    name: 'Business Strategist',
    version: '0.2.0',
    source: 'builtin',
    slots: ['weapon', 'accessory', 'magic'],
    description: 'Business diagnosis, pricing, positioning, GTM, and execution planning.',
    trigger: ['business', 'pricing', 'strategy', 'gtm', 'kpi', 'sales', 'proposal'],
    permissions: [],
    contextCost: 'medium',
    instructions: 'Separate facts, assumptions, and inferences. Recommend a direction with measurable execution steps and risk controls.'
  },
  {
    id: 'natural-writing',
    name: 'Natural Writing',
    version: '0.2.0',
    source: 'builtin',
    slots: ['accessory'],
    description: 'Natural multilingual writing with consistent tone.',
    trigger: ['write', 'rewrite', 'copy', 'caption', 'email', 'article'],
    permissions: [],
    contextCost: 'low',
    instructions: 'Write naturally in the user language. Preserve intent and voice. Avoid stiff templates and unnecessary jargon.'
  }
];
