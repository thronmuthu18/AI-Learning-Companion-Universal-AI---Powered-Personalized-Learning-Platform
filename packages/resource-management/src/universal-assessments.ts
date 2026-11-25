import type { Assessment, AssessmentQuestion } from '@alc/shared-types';

/**
 * Universal multi-domain, multi-modal assessment questions spanning
 * GATE ECE, Python Programming, Business Accounting, Physics,
 * Competitive Examinations, and Graphic Design.
 */
export const MULTI_DOMAIN_DIAGNOSTIC_QUESTIONS: AssessmentQuestion[] = [
  // 1. GATE ECE (Numerical with unit + MCQ)
  {
    id: 'udq_ece_num_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'ece-network-theory',
    questionType: 'numerical',
    difficulty: 'beginner',
    prompt: 'Two resistors of 6 ohm and 12 ohm are connected in parallel across terminals A-B. What is the Thevenin equivalent resistance Rth?',
    options: [],
    correctOptionIndex: -1,
    expectedNumericAnswer: 4,
    numericTolerance: 0.05,
    expectedUnit: 'ohm',
    acceptableUnits: ['ohm', 'ohms', 'ω'],
    explanation: 'Parallel combination Rth = (6 * 12) / (6 + 12) = 72 / 18 = 4 ohm.',
    incorrectFeedback: 'For two resistors in parallel, use R_eq = (R1 * R2) / (R1 + R2) in ohms.',
    estimatedSeconds: 60,
  },
  {
    id: 'udq_ece_mcq_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'ece-signals-systems',
    questionType: 'mcq',
    difficulty: 'intermediate',
    prompt: 'A causal LTI system is BIBO stable if and only if all poles of its rational Laplace transfer function H(s) lie:',
    options: [
      'Strictly in the right half of the s-plane',
      'Strictly in the left half of the s-plane',
      'Directly on the jω axis',
      'At infinity',
    ],
    correctOptionIndex: 1,
    explanation: 'Causal LTI BIBO stability requires every pole to have Re(s) < 0 (strictly left half-plane).',
    incorrectFeedback: 'Right-half poles cause exponential divergence and poles on jω lead to marginal/unbounded resonance.',
    estimatedSeconds: 45,
  },

  // 2. Python Programming (Multiple-select + Safe static Coding test cases)
  {
    id: 'udq_py_ms_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'python-core',
    questionType: 'multiple_select',
    difficulty: 'beginner',
    prompt: 'Select ALL built-in Python data types below that are immutable:',
    options: ['tuple', 'list', 'str', 'dict'],
    correctOptionIndex: -1,
    correctOptionIndices: [0, 2],
    explanation: '`tuple` and `str` objects cannot be mutated in place; `list` and `dict` are mutable.',
    incorrectFeedback: 'Remember: `list` and `dict` support in-place mutation (`append`, key assignment), whereas `tuple` and `str` do not.',
    estimatedSeconds: 45,
  },
  {
    id: 'udq_py_code_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'python-core',
    questionType: 'coding',
    difficulty: 'intermediate',
    prompt: 'Write a Python function `safe_mean(nums)` that returns the arithmetic mean of non-empty list `nums` and returns `0` if `nums` is empty.',
    options: [],
    correctOptionIndex: -1,
    codingTestCases: [
      { id: 'tc1', description: 'Defines function safe_mean', requiredPatterns: ['def safe_mean('] },
      { id: 'tc2', description: 'Guards empty list without dividing by zero', requiredPatterns: ['if not nums', 'return 0'] },
      { id: 'tc3', description: 'Computes sum divided by len', requiredPatterns: ['sum(nums)', 'len(nums)'] },
    ],
    explanation: 'Using an explicit emptiness guard `if not nums: return 0` prevents `ZeroDivisionError` before returning `sum(nums) / len(nums)`.',
    incorrectFeedback: 'Ensure your function defines `def safe_mean(nums):`, guards `if not nums: return 0`, and computes `sum(nums) / len(nums)`.',
    estimatedSeconds: 90,
  },

  // 3. Business Accounting (Numerical + Case Study Rubric)
  {
    id: 'udq_acct_num_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'acct-basics',
    questionType: 'numerical',
    difficulty: 'beginner',
    prompt: 'A company reports Total Assets of 250000 INR and Total Liabilities of 95000 INR. Calculate Owner Equity (INR) using the accounting equation.',
    options: [],
    correctOptionIndex: -1,
    expectedNumericAnswer: 155000,
    numericTolerance: 1,
    expectedUnit: 'INR',
    acceptableUnits: ['inr', 'rs'],
    explanation: 'Equity = Assets - Liabilities = 250,000 - 95,000 = 155,000 INR.',
    incorrectFeedback: 'Apply Assets = Liabilities + Equity -> Equity = Assets - Liabilities.',
    estimatedSeconds: 50,
  },
  {
    id: 'udq_acct_case_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'acct-statements',
    questionType: 'case_study',
    difficulty: 'intermediate',
    prompt: 'Case Study: A profitable retail firm shows strong net income on its Income Statement yet negative operating cash flow for 3 quarters while accounts receivable surged. Explain the liquidity risk and two diagnostic ratios to inspect.',
    options: [],
    correctOptionIndex: -1,
    rubricCriteria: [
      { id: 'c1', description: 'Identifies accrual revenue vs cash collection lag in working capital', keywords: ['receivable', 'cash', 'accrual', 'working capital'], maxPoints: 2 },
      { id: 'c2', description: 'Cites relevant liquidity or turnover metrics (Current Ratio / Quick Ratio / DSO)', keywords: ['current ratio', 'quick ratio', 'turnover', 'dso', 'liquidity'], maxPoints: 2 },
    ],
    referenceAnswer: 'Accrual net income can outpace cash when customers delay paying receivables (working capital drain). Check Current Ratio, Quick Ratio, or Days Sales Outstanding (DSO).',
    explanation: 'Profit does not guarantee liquidity when cash is tied up in unpaid accounts receivable.',
    incorrectFeedback: 'Connect accounts receivable growth to operating cash shortfall and cite liquidity/efficiency ratios such as Current Ratio, Quick Ratio, or DSO.',
    estimatedSeconds: 120,
  },

  // 4. Physics (Numerical with tolerance/units + Descriptive Rubric)
  {
    id: 'udq_phys_num_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'phys-mechanics',
    questionType: 'numerical',
    difficulty: 'intermediate',
    prompt: 'Compute the weight (gravitational force) of a 10 kg object near Earth surface using g = 9.8 m/s^2. Provide numeric value and SI force unit.',
    options: [],
    correctOptionIndex: -1,
    expectedNumericAnswer: 98,
    numericTolerance: 0.5,
    expectedUnit: 'N',
    acceptableUnits: ['n', 'newton', 'newtons'],
    explanation: 'F = m * g = 10 kg * 9.8 m/s^2 = 98 N.',
    incorrectFeedback: 'Multiply mass (10 kg) by g (9.8 m/s^2) and specify force in Newtons (N).',
    estimatedSeconds: 45,
  },
  {
    id: 'udq_phys_desc_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'phys-electromagnetism',
    questionType: 'descriptive',
    difficulty: 'intermediate',
    prompt: 'State Faraday law of electromagnetic induction and explain the physical meaning of the negative sign (Lenz law).',
    options: [],
    correctOptionIndex: -1,
    rubricCriteria: [
      { id: 'p1', description: 'Relates induced EMF to rate of change of magnetic flux', keywords: ['emf', 'magnetic flux', 'rate', 'change'], maxPoints: 2 },
      { id: 'p2', description: 'Explains opposition to flux change & energy conservation', keywords: ['oppose', 'lenz', 'conservation', 'energy'], maxPoints: 2 },
    ],
    referenceAnswer: 'Induced EMF equals minus the time rate of change of magnetic flux (-dPhi/dt); Lenz law states the induced current opposes the flux change, upholding conservation of energy.',
    explanation: 'Induced EMF opposes the change in magnetic flux that produces it.',
    incorrectFeedback: 'Mention both rate of change of magnetic flux and how the negative sign (Lenz law) opposes that change due to conservation of energy.',
    estimatedSeconds: 90,
  },

  // 5. Competitive Examinations (Numerical + Flashcard)
  {
    id: 'udq_exam_num_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'exam-quant-reasoning',
    questionType: 'numerical',
    difficulty: 'beginner',
    prompt: 'A train travels 180 km at 60 km/h and returns 180 km at 90 km/h. What is its average speed (in km/h) for the full round trip?',
    options: [],
    correctOptionIndex: -1,
    expectedNumericAnswer: 72,
    numericTolerance: 0.1,
    expectedUnit: 'km/h',
    acceptableUnits: ['km/h', 'kmph'],
    explanation: 'Harmonic mean over equal distances: 2 * 60 * 90 / (60 + 90) = 10800 / 150 = 72 km/h.',
    incorrectFeedback: 'For equal distances, average speed is the harmonic mean (total distance / total time), not arithmetic average 75.',
    estimatedSeconds: 60,
  },
  {
    id: 'udq_exam_fc_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'exam-strategy',
    questionType: 'flashcard',
    difficulty: 'intermediate',
    prompt: 'Active Recall: What 3-step error-log review protocol maximizes retention after a timed mock exam?',
    options: ['Need more review', 'Recalled accurately'],
    correctOptionIndex: 1,
    referenceAnswer: 'Classify error root cause (concept gap vs misread vs time panic), schedule spaced re-attempt in 3–5 days, and drill 2 similar problems before full re-test.',
    explanation: 'Categorizing root causes and re-testing via spaced intervals fixes recurring mock errors.',
    incorrectFeedback: 'Review your mock error log categorization before the next timed mock.',
    estimatedSeconds: 30,
  },

  // 6. Graphic Design / Practical Domain (Scenario + Practical Rubric)
  {
    id: 'udq_design_scen_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'design-typography',
    questionType: 'scenario',
    difficulty: 'beginner',
    prompt: 'Scenario: A dark-theme editorial landing card has tiny grey body text (#555555 on #111111) and identical 16px size for both headlines and captions. Which fix establishes clear WCAG readability and typographic hierarchy first?',
    options: [
      'Use light high-contrast body text (#E2E8F0+), scale headline size 2x+, and reserve muted slate for secondary metadata',
      'Make all paragraphs uppercase and bold at 12px',
      'Replace body copy with gradient backgrounds',
      'Center-align long prose blocks in narrow columns',
    ],
    correctOptionIndex: 0,
    explanation: 'High luminance contrast ensures WCAG legibility while distinct typographic scale guides scanning order.',
    incorrectFeedback: 'Prioritize contrast ratios and clear size/weight separation between headings and body text.',
    estimatedSeconds: 45,
  },
  {
    id: 'udq_design_prac_1',
    assessmentId: 'assess_universal_diagnostic',
    skillId: 'design-layout-hierarchy',
    questionType: 'practical',
    difficulty: 'intermediate',
    prompt: 'Practical Critique: Describe how you would restructure a cluttered poster containing 5 equal-weight callout boxes using Swiss grid alignment, whitespace, and a primary focal anchor.',
    options: [],
    correctOptionIndex: -1,
    rubricCriteria: [
      { id: 'd1', description: 'Establishes single primary focal point via scale or contrast', keywords: ['focal', 'scale', 'contrast', 'primary'], maxPoints: 2 },
      { id: 'd2', description: 'Applies consistent grid columns and generous negative space / whitespace', keywords: ['grid', 'whitespace', 'negative space', 'alignment'], maxPoints: 2 },
    ],
    referenceAnswer: 'Consolidate related items into a 12-column grid, enlarge one dominant focal headline/visual, and use intentional whitespace around secondary points.',
    explanation: 'Reducing competing focal weights through scale contrast and whitespace restores scannable visual hierarchy.',
    incorrectFeedback: 'Address single focal hierarchy, grid alignment, and negative space separation.',
    estimatedSeconds: 90,
  },
];

export function buildGoalScopedDiagnostic(params: {
  targetSkillIds: string[];
  coreQuestions: AssessmentQuestion[];
  title?: string;
}): { assessment: Assessment; questions: AssessmentQuestion[] } {
  const allBank = [...MULTI_DOMAIN_DIAGNOSTIC_QUESTIONS, ...params.coreQuestions];
  const targetSet = new Set(params.targetSkillIds);
  const matching =
    targetSet.size > 0
      ? allBank.filter((q) => targetSet.has(q.skillId))
      : allBank;
  const selected = matching.length > 0 ? matching : allBank.slice(0, 8);

  return {
    assessment: {
      id: targetSet.size > 0 ? `assess_goal_${Array.from(targetSet)[0]}` : 'assess_universal_diagnostic',
      title: params.title ?? 'Universal Domain Diagnostic Assessment',
      description: 'Multi-modal baseline assessment tailored to your active domain and skill targets.',
      kind: 'diagnostic',
      targetSkillIds: Array.from(new Set(selected.map((q) => q.skillId))),
      difficulty: 'intermediate',
      questionIds: selected.map((q) => q.id),
      createdAt: '2026-11-25T00:00:00.000Z',
    },
    questions: selected,
  };
}
