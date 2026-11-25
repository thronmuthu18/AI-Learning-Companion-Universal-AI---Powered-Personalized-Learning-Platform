import type {
  AssessmentBlueprint,
  DomainCategory,
  DomainDefinition,
  Skill,
  SkillPrerequisite,
  SubjectDefinition,
  SubtopicDefinition,
  TopicDefinition,
} from '@alc/shared-types';

/**
 * 30 Universal Knowledge & Skill Domains.
 * Honest contentStatus tracking: never falsely claims all domains have complete bundled lessons.
 */
export const UNIVERSAL_DOMAINS: DomainDefinition[] = [
  { id: 'dom_cs_it', name: 'Computer Science and IT', summary: 'Algorithms, systems, databases, architecture, and core computing.', contentStatus: 'available' },
  { id: 'dom_programming', name: 'Programming and Software Development', summary: 'Programming languages, web/mobile engineering, and testing.', contentStatus: 'available' },
  { id: 'dom_ai_ml', name: 'Artificial Intelligence and Machine Learning', summary: 'Statistical ML, neural networks, and edge LLM engineering.', contentStatus: 'available' },
  { id: 'dom_data_science', name: 'Data Science and Analytics', summary: 'Data wrangling, statistical inference, and visualization.', contentStatus: 'partial' },
  { id: 'dom_cybersecurity', name: 'Cybersecurity and Networking', summary: 'Network security, threat modeling, cryptography, and AppSec.', contentStatus: 'available' },
  { id: 'dom_cloud_devops', name: 'Cloud Computing and DevOps', summary: 'Containers, CI/CD, infrastructure-as-code, and observability.', contentStatus: 'planned' },
  { id: 'dom_ece', name: 'Electronics and Communication Engineering', summary: 'Signals & systems, analog/digital circuits, VLSI, and communications.', contentStatus: 'partial' },
  { id: 'dom_eee', name: 'Electrical and Electronics Engineering', summary: 'Circuit theory, power systems, machines, and control systems.', contentStatus: 'planned' },
  { id: 'dom_mechanical', name: 'Mechanical Engineering', summary: 'Thermodynamics, mechanics of materials, fluid dynamics, and CAD.', contentStatus: 'planned' },
  { id: 'dom_civil', name: 'Civil Engineering', summary: 'Structural analysis, geotechnics, surveying, and hydrology.', contentStatus: 'planned' },
  { id: 'dom_math_stats', name: 'Mathematics and Statistics', summary: 'Calculus, linear algebra, discrete math, and probability.', contentStatus: 'partial' },
  { id: 'dom_physics_chem', name: 'Physics and Chemistry', summary: 'Classical mechanics, electromagnetism, quantum basics, and chemistry.', contentStatus: 'partial' },
  { id: 'dom_biology', name: 'Biology and Life Sciences', summary: 'Cell biology, genetics, ecology, and biochemistry.', contentStatus: 'planned' },
  { id: 'dom_medical', name: 'Medical and Healthcare Education', summary: 'Anatomy, physiology, clinical case reasoning, and pharmacology.', contentStatus: 'planned' },
  { id: 'dom_business', name: 'Business and Management', summary: 'Operations, strategy, organizational leadership, and project management.', contentStatus: 'partial' },
  { id: 'dom_accounting', name: 'Accounting and Finance', summary: 'Bookkeeping, financial statements, corporate finance, and cost accounting.', contentStatus: 'partial' },
  { id: 'dom_economics', name: 'Economics and Commerce', summary: 'Microeconomics, macroeconomics, trade, and market analysis.', contentStatus: 'planned' },
  { id: 'dom_marketing', name: 'Marketing and Entrepreneurship', summary: 'Customer discovery, positioning, analytics, and venture building.', contentStatus: 'planned' },
  { id: 'dom_law', name: 'Law and Legal Studies', summary: 'Constitutional principles, contracts, legal reasoning, and case analysis.', contentStatus: 'planned' },
  { id: 'dom_arts_hum', name: 'Arts and Humanities', summary: 'History, philosophy, literature, and critical inquiry.', contentStatus: 'planned' },
  { id: 'dom_languages', name: 'Languages and Communication', summary: 'Grammar, technical writing, comprehension, and multilingual fluency.', contentStatus: 'planned' },
  { id: 'dom_competitive_exams', name: 'Competitive Examinations', summary: 'GATE, GRE, aptitude, logical reasoning, and timed exam mastery.', contentStatus: 'partial' },
  { id: 'dom_govt_exams', name: 'Government and Public Service Exam Preparation', summary: 'Civics, quantitative aptitude, policy, and structured mock drills.', contentStatus: 'planned' },
  { id: 'dom_design', name: 'Design and Creative Arts', summary: 'Visual hierarchy, typography, UX systems, and industrial design.', contentStatus: 'partial' },
  { id: 'dom_animation', name: 'Animation and Multimedia', summary: 'Motion principles, 3D pipelines, storyboarding, and editing.', contentStatus: 'planned' },
  { id: 'dom_music', name: 'Music and Performing Arts', summary: 'Music theory, ear training, rhythm, and performance craft.', contentStatus: 'planned' },
  { id: 'dom_agriculture', name: 'Agriculture and Environmental Studies', summary: 'Soil science, agronomy, ecology, and sustainable water systems.', contentStatus: 'planned' },
  { id: 'dom_vocational', name: 'Vocational and Industrial Skills', summary: 'Electrical wiring, CNC/manufacturing, diagnostics, and safety.', contentStatus: 'planned' },
  { id: 'dom_prof_dev', name: 'Professional Development', summary: 'Communication, time management, pedagogy, and career certifications.', contentStatus: 'partial' },
  { id: 'dom_research', name: 'Research and Academic Learning', summary: 'Experimental design, literature synthesis, and scholarly writing.', contentStatus: 'planned' },
];

export const UNIVERSAL_CATEGORIES: DomainCategory[] = [
  { id: 'cat_computing', domainId: 'dom_cs_it', name: 'Core Computer Science' },
  { id: 'cat_swe', domainId: 'dom_programming', name: 'Software Engineering' },
  { id: 'cat_ai', domainId: 'dom_ai_ml', name: 'Machine Learning & LLMs' },
  { id: 'cat_ds', domainId: 'dom_data_science', name: 'Analytics & Modeling' },
  { id: 'cat_sec', domainId: 'dom_cybersecurity', name: 'Security & Networks' },
  { id: 'cat_ece_gate', domainId: 'dom_ece', name: 'ECE Core & GATE ECE' },
  { id: 'cat_math', domainId: 'dom_math_stats', name: 'Pure & Applied Mathematics' },
  { id: 'cat_physics', domainId: 'dom_physics_chem', name: 'Physics' },
  { id: 'cat_accounting', domainId: 'dom_accounting', name: 'Financial & Managerial Accounting' },
  { id: 'cat_exams', domainId: 'dom_competitive_exams', name: 'Aptitude & Exam Strategy' },
];

export const UNIVERSAL_SUBJECTS: SubjectDefinition[] = [
  { id: 'sub_cs_foundations', domainId: 'dom_cs_it', categoryId: 'cat_computing', name: 'Algorithms, Databases & OS', description: 'Data structures, SQL, OS, and networks.', contentStatus: 'available', defaultAssessmentModes: ['mcq', 'coding', 'descriptive'] },
  { id: 'sub_software_dev', domainId: 'dom_programming', categoryId: 'cat_swe', name: 'Python, TypeScript & Web Systems', description: 'Modern software construction and APIs.', contentStatus: 'available', defaultAssessmentModes: ['coding', 'mcq'] },
  { id: 'sub_ai_systems', domainId: 'dom_ai_ml', categoryId: 'cat_ai', name: 'Machine Learning & Edge LLMs', description: 'Supervised learning, neural nets, and quantization.', contentStatus: 'available', defaultAssessmentModes: ['mcq', 'coding', 'case_study'] },
  { id: 'sub_ece_signals', domainId: 'dom_ece', categoryId: 'cat_ece_gate', name: 'Signals, Circuits & Communications (GATE ECE)', description: 'Signals & systems, analog/digital electronics, control, and communication.', contentStatus: 'partial', defaultAssessmentModes: ['numerical', 'mcq'] },
  { id: 'sub_physics_core', domainId: 'dom_physics_chem', categoryId: 'cat_physics', name: 'Classical Mechanics & Electromagnetism', description: 'Kinematics, dynamics, Maxwell equations, and quantum basics.', contentStatus: 'partial', defaultAssessmentModes: ['numerical', 'descriptive', 'mcq'] },
  { id: 'sub_business_acct', domainId: 'dom_accounting', categoryId: 'cat_accounting', name: 'Business & Financial Accounting', description: 'Double-entry bookkeeping, financial statements, and cost analysis.', contentStatus: 'partial', defaultAssessmentModes: ['numerical', 'case_study', 'mcq'] },
  { id: 'sub_comp_aptitude', domainId: 'dom_competitive_exams', categoryId: 'cat_exams', name: 'Competitive Exam Aptitude & Verbal', description: 'Quantitative aptitude, logical reasoning, and timed mocks.', contentStatus: 'partial', defaultAssessmentModes: ['mcq', 'flashcard', 'numerical'] },
];

export const UNIVERSAL_TOPICS: TopicDefinition[] = [
  { id: 'top_ece_1', subjectId: 'sub_ece_signals', name: 'Continuous & Discrete Signals', orderIndex: 1 },
  { id: 'top_ece_2', subjectId: 'sub_ece_signals', name: 'Analog & Digital Circuits', orderIndex: 2 },
  { id: 'top_phys_1', subjectId: 'sub_physics_core', name: 'Newtonian Mechanics', orderIndex: 1 },
  { id: 'top_phys_2', subjectId: 'sub_physics_core', name: 'Electromagnetism & Fields', orderIndex: 2 },
  { id: 'top_acct_1', subjectId: 'sub_business_acct', name: 'Bookkeeping & Trial Balance', orderIndex: 1 },
  { id: 'top_acct_2', subjectId: 'sub_business_acct', name: 'Statements & Cost Analysis', orderIndex: 2 },
];

export const UNIVERSAL_SUBTOPICS: SubtopicDefinition[] = [
  { id: 'subtop_ece_fourier', topicId: 'top_ece_1', name: 'Fourier & Laplace Transforms', orderIndex: 1 },
  { id: 'subtop_phys_laws', topicId: 'top_phys_1', name: 'Conservation Laws & Torque', orderIndex: 1 },
  { id: 'subtop_acct_ledger', topicId: 'top_acct_1', name: 'Debits, Credits & General Ledger', orderIndex: 1 },
];

export const UNIVERSAL_BLUEPRINTS: AssessmentBlueprint[] = [
  { id: 'bp_ece', subjectId: 'sub_ece_signals', supportedQuestionTypes: ['numerical', 'mcq'], recommendedDurationMinutes: 45, passingThresholdPercent: 65 },
  { id: 'bp_physics', subjectId: 'sub_physics_core', supportedQuestionTypes: ['numerical', 'descriptive', 'mcq'], recommendedDurationMinutes: 40, passingThresholdPercent: 65 },
  { id: 'bp_accounting', subjectId: 'sub_business_acct', supportedQuestionTypes: ['numerical', 'case_study', 'mcq'], recommendedDurationMinutes: 35, passingThresholdPercent: 70 },
  { id: 'bp_aptitude', subjectId: 'sub_comp_aptitude', supportedQuestionTypes: ['mcq', 'numerical', 'flashcard'], recommendedDurationMinutes: 30, passingThresholdPercent: 70 },
  { id: 'bp_software', subjectId: 'sub_software_dev', supportedQuestionTypes: ['coding', 'mcq'], recommendedDurationMinutes: 35, passingThresholdPercent: 75 },
];

export const UNIVERSAL_SKILLS: Skill[] = [
  // CS / Software / AI / Security (existing IDs preserved)
  { id: 'prog-fundamentals', slug: 'programming-fundamentals', name: 'Programming Fundamentals & Logic', domain: 'Computer Science and IT', domainId: 'dom_cs_it', subjectId: 'sub_cs_foundations', description: 'Variables, control flow, functions, recursion, and problem decomposition.', difficulty: 'beginner', estimatedHours: 10, recommendedActivityTypes: ['lesson', 'coding', 'mcq'], contentStatus: 'available' },
  { id: 'git-cli', slug: 'git-version-control', name: 'Git & Command Line Workflows', domain: 'Programming and Software Development', domainId: 'dom_programming', subjectId: 'sub_software_dev', description: 'Shell navigation, branching, merging, and reproducible repositories.', difficulty: 'beginner', estimatedHours: 5, recommendedActivityTypes: ['lesson', 'practical', 'mcq'], contentStatus: 'available' },
  { id: 'html-css', slug: 'html-css-accessibility', name: 'HTML5, CSS3 & Accessible UI', domain: 'Programming and Software Development', domainId: 'dom_programming', subjectId: 'sub_software_dev', description: 'Semantic markup, Flexbox/Grid, responsive layouts, and WCAG contrast.', difficulty: 'beginner', estimatedHours: 10, recommendedActivityTypes: ['lesson', 'practical', 'project'], contentStatus: 'available' },
  { id: 'js-ts', slug: 'javascript-typescript', name: 'JavaScript & TypeScript', domain: 'Programming and Software Development', domainId: 'dom_programming', subjectId: 'sub_software_dev', description: 'ES2022 async programming, closures, strict TypeScript type systems.', difficulty: 'intermediate', estimatedHours: 16, recommendedActivityTypes: ['lesson', 'coding', 'mcq'], contentStatus: 'available' },
  { id: 'react-ui', slug: 'react-modern-ui', name: 'React & State Architecture', domain: 'Programming and Software Development', domainId: 'dom_programming', subjectId: 'sub_software_dev', description: 'Component composition, hooks, state management, and performance.', difficulty: 'intermediate', estimatedHours: 18, recommendedActivityTypes: ['lesson', 'coding', 'project'], contentStatus: 'available' },
  { id: 'node-apis', slug: 'nodejs-rest-apis', name: 'Backend APIs & Node.js', domain: 'Programming and Software Development', domainId: 'dom_programming', subjectId: 'sub_software_dev', description: 'RESTful routing, input validation, auth, error handling, and middleware.', difficulty: 'intermediate', estimatedHours: 16, recommendedActivityTypes: ['lesson', 'coding', 'project'], contentStatus: 'available' },
  { id: 'sql-databases', slug: 'sql-relational-databases', name: 'SQL & Relational Data Modeling', domain: 'Computer Science and IT', domainId: 'dom_cs_it', subjectId: 'sub_cs_foundations', description: 'Normalization, primary/foreign keys, indexing, joins, and transactions.', difficulty: 'intermediate', estimatedHours: 14, recommendedActivityTypes: ['lesson', 'practical', 'mcq'], contentStatus: 'available' },
  { id: 'python-core', slug: 'python-programming', name: 'Python Programming', domain: 'Programming and Software Development', domainId: 'dom_programming', subjectId: 'sub_software_dev', description: 'Data structures, OOP, comprehensions, virtual environments, and testing.', difficulty: 'beginner', estimatedHours: 14, recommendedActivityTypes: ['lesson', 'coding', 'mcq'], contentStatus: 'available' },
  { id: 'dsa-algorithms', slug: 'data-structures-algorithms', name: 'Data Structures & Algorithms', domain: 'Computer Science and IT', domainId: 'dom_cs_it', subjectId: 'sub_cs_foundations', description: 'Trees, graphs, dynamic programming, complexity analysis, and sorting.', difficulty: 'intermediate', estimatedHours: 24, recommendedActivityTypes: ['lesson', 'coding', 'numerical'], contentStatus: 'available' },
  { id: 'math-linear-prob', slug: 'linear-algebra-probability', name: 'Linear Algebra & Probability', domain: 'Mathematics and Statistics', domainId: 'dom_math_stats', description: 'Vectors, matrices, eigenvalues, Bayes theorem, and distributions.', difficulty: 'intermediate', estimatedHours: 18, recommendedActivityTypes: ['lesson', 'numerical', 'mcq'], contentStatus: 'partial' },
  { id: 'data-analysis', slug: 'data-analysis-pandas', name: 'Data Wrangling & Exploratory Analysis', domain: 'Data Science and Analytics', domainId: 'dom_data_science', description: 'NumPy, Pandas, visualization, statistical inference, and data cleaning.', difficulty: 'intermediate', estimatedHours: 16, recommendedActivityTypes: ['lesson', 'coding', 'case_study'], contentStatus: 'partial' },
  { id: 'ml-foundations', slug: 'machine-learning-foundations', name: 'Supervised & Unsupervised ML', domain: 'Artificial Intelligence and Machine Learning', domainId: 'dom_ai_ml', subjectId: 'sub_ai_systems', description: 'Regression, classification, cross-validation, regularization, and ensembles.', difficulty: 'intermediate', estimatedHours: 22, recommendedActivityTypes: ['lesson', 'coding', 'case_study'], contentStatus: 'available' },
  { id: 'deep-learning-llm', slug: 'deep-learning-and-llms', name: 'Deep Learning & Edge LLMs', domain: 'Artificial Intelligence and Machine Learning', domainId: 'dom_ai_ml', subjectId: 'sub_ai_systems', description: 'Neural nets, transformers, quantization, tokenization, and local deployment.', difficulty: 'advanced', estimatedHours: 26, recommendedActivityTypes: ['lesson', 'coding', 'project'], contentStatus: 'available' },
  { id: 'cyber-networking', slug: 'networking-security-basics', name: 'Networking & Security Foundations', domain: 'Cybersecurity and Networking', domainId: 'dom_cybersecurity', description: 'TCP/IP, TLS, threat modeling, OWASP Top 10, and secure storage.', difficulty: 'intermediate', estimatedHours: 16, recommendedActivityTypes: ['lesson', 'case_study', 'mcq'], contentStatus: 'available' },
  { id: 'cyber-appsec', slug: 'application-security-hardening', name: 'Application Security & Auditing', domain: 'Cybersecurity and Networking', domainId: 'dom_cybersecurity', description: 'Input sanitization, cryptography hygiene, dependency auditing, and defense.', difficulty: 'advanced', estimatedHours: 18, recommendedActivityTypes: ['lesson', 'case_study', 'practical'], contentStatus: 'available' },
  { id: 'cs-systems-gate', slug: 'os-dbms-networks-gate', name: 'Core CS Systems (OS, DBMS, CN, TOC)', domain: 'Computer Science and IT', domainId: 'dom_cs_it', subjectId: 'sub_cs_foundations', description: 'Operating systems, scheduling, deadlock, normalization, and automata.', difficulty: 'advanced', estimatedHours: 28, recommendedActivityTypes: ['lesson', 'numerical', 'mcq'], contentStatus: 'partial' },

  // GATE ECE / Electronics Engineering
  { id: 'ece-network-theory', slug: 'ece-network-theory', name: 'Network Theory & Circuit Analysis', domain: 'Electronics and Communication Engineering', domainId: 'dom_ece', subjectId: 'sub_ece_signals', description: 'KCL/KVL, Thevenin/Norton equivalents, transient response, and two-port networks.', difficulty: 'beginner', estimatedHours: 16, recommendedActivityTypes: ['lesson', 'numerical', 'mcq'], contentStatus: 'partial' },
  { id: 'ece-signals-systems', slug: 'ece-signals-systems', name: 'Signals & Systems (Laplace, Fourier, Z-Transform)', domain: 'Electronics and Communication Engineering', domainId: 'dom_ece', subjectId: 'sub_ece_signals', topicId: 'top_ece_1', subtopicId: 'subtop_ece_fourier', description: 'LTI systems, convolution, Fourier series/transform, Laplace & Z-transforms.', difficulty: 'intermediate', estimatedHours: 22, recommendedActivityTypes: ['lesson', 'numerical', 'mcq'], contentStatus: 'partial' },
  { id: 'ece-analog-digital', slug: 'ece-analog-digital-electronics', name: 'Analog & Digital Electronics', domain: 'Electronics and Communication Engineering', domainId: 'dom_ece', subjectId: 'sub_ece_signals', topicId: 'top_ece_2', description: 'MOSFET/BJT amplifiers, op-amps, Boolean algebra, FSMs, and converters.', difficulty: 'intermediate', estimatedHours: 24, recommendedActivityTypes: ['lesson', 'numerical', 'practical'], contentStatus: 'partial' },
  { id: 'ece-control-comm', slug: 'ece-control-and-communication-systems', name: 'Control Systems & Digital Communications', domain: 'Electronics and Communication Engineering', domainId: 'dom_ece', subjectId: 'sub_ece_signals', description: 'Bode/Nyquist stability, modulation schemes, SNR, and information theory.', difficulty: 'advanced', estimatedHours: 26, recommendedActivityTypes: ['lesson', 'numerical', 'mcq'], contentStatus: 'partial' },

  // Physics
  { id: 'phys-math-methods', slug: 'physics-vectors-calculus', name: 'Mathematical Methods for Physics (Vectors & Calculus)', domain: 'Physics and Chemistry', domainId: 'dom_physics_chem', subjectId: 'sub_physics_core', description: 'Vector calculus, differential equations, and dimensional analysis.', difficulty: 'beginner', estimatedHours: 14, recommendedActivityTypes: ['lesson', 'numerical', 'mcq'], contentStatus: 'partial' },
  { id: 'phys-mechanics', slug: 'physics-classical-mechanics', name: 'Classical Mechanics & Conservation Laws', domain: 'Physics and Chemistry', domainId: 'dom_physics_chem', subjectId: 'sub_physics_core', topicId: 'top_phys_1', subtopicId: 'subtop_phys_laws', description: 'Newtonian dynamics, work-energy, rotational motion, and Lagrangian basics.', difficulty: 'intermediate', estimatedHours: 20, recommendedActivityTypes: ['lesson', 'numerical', 'descriptive'], contentStatus: 'partial' },
  { id: 'phys-electromagnetism', slug: 'physics-electromagnetism', name: 'Electromagnetism & Maxwell Equations', domain: 'Physics and Chemistry', domainId: 'dom_physics_chem', subjectId: 'sub_physics_core', topicId: 'top_phys_2', description: 'Electrostatics, Gauss law, Faraday induction, and electromagnetic waves.', difficulty: 'intermediate', estimatedHours: 22, recommendedActivityTypes: ['lesson', 'numerical', 'descriptive'], contentStatus: 'partial' },
  { id: 'phys-quantum-intro', slug: 'physics-quantum-foundations', name: 'Quantum Mechanics Foundations', domain: 'Physics and Chemistry', domainId: 'dom_physics_chem', subjectId: 'sub_physics_core', description: 'Wave-particle duality, Schrodinger equation, operators, and potential wells.', difficulty: 'advanced', estimatedHours: 24, recommendedActivityTypes: ['lesson', 'numerical', 'descriptive'], contentStatus: 'planned' },

  // Business Accounting & Finance
  { id: 'acct-basics', slug: 'accounting-double-entry-basics', name: 'Accounting Equation & Double-Entry Bookkeeping', domain: 'Accounting and Finance', domainId: 'dom_accounting', subjectId: 'sub_business_acct', topicId: 'top_acct_1', subtopicId: 'subtop_acct_ledger', description: 'Assets, liabilities, equity, debits/credits, journal entries, and trial balance.', difficulty: 'beginner', estimatedHours: 12, recommendedActivityTypes: ['lesson', 'numerical', 'case_study'], contentStatus: 'partial' },
  { id: 'acct-statements', slug: 'accounting-financial-statements', name: 'Financial Statements & Ratio Analysis', domain: 'Accounting and Finance', domainId: 'dom_accounting', subjectId: 'sub_business_acct', topicId: 'top_acct_2', description: 'Income statement, balance sheet, cash flow statement, liquidity & solvency ratios.', difficulty: 'intermediate', estimatedHours: 16, recommendedActivityTypes: ['lesson', 'case_study', 'numerical'], contentStatus: 'partial' },
  { id: 'acct-cost-managerial', slug: 'accounting-cost-and-budgeting', name: 'Cost Accounting & Managerial Budgeting', domain: 'Accounting and Finance', domainId: 'dom_accounting', subjectId: 'sub_business_acct', description: 'Break-even CVP analysis, variance analysis, overhead allocation, and forecasting.', difficulty: 'advanced', estimatedHours: 18, recommendedActivityTypes: ['lesson', 'case_study', 'numerical'], contentStatus: 'planned' },

  // Competitive Examinations & Universal Study Skills
  { id: 'exam-quant-reasoning', slug: 'exam-quantitative-logical-reasoning', name: 'Quantitative Aptitude & Logical Reasoning', domain: 'Competitive Examinations', domainId: 'dom_competitive_exams', subjectId: 'sub_comp_aptitude', description: 'Number systems, combinatorics, data interpretation, and deductive reasoning.', difficulty: 'beginner', estimatedHours: 16, recommendedActivityTypes: ['lesson', 'numerical', 'mcq'], contentStatus: 'partial' },
  { id: 'exam-verbal-comprehension', slug: 'exam-verbal-comprehension', name: 'Analytical Reading & Verbal Reasoning', domain: 'Languages and Communication', domainId: 'dom_languages', subjectId: 'sub_comp_aptitude', description: 'Critical passage synthesis, inference accuracy, and argument evaluation.', difficulty: 'intermediate', estimatedHours: 12, recommendedActivityTypes: ['lesson', 'flashcard', 'descriptive'], contentStatus: 'planned' },
  { id: 'exam-strategy', slug: 'quantitative-exam-mastery', name: 'Timed Mock Analysis & Exam Strategy', domain: 'Competitive Examinations', domainId: 'dom_competitive_exams', subjectId: 'sub_comp_aptitude', description: 'Timed problem solving, error logs, spaced repetition, and mock analysis.', difficulty: 'intermediate', estimatedHours: 12, recommendedActivityTypes: ['mcq', 'revision', 'flashcard'], contentStatus: 'partial' },

  // Graphic Design & Creative Arts
  { id: 'design-typography', slug: 'graphic-design-typography', name: 'Typography & Type Scale Systems', domain: 'Design and Creative Arts', domainId: 'dom_design', description: 'Typeface pairing, hierarchy, line height, contrast, and grid alignment.', difficulty: 'beginner', estimatedHours: 10, recommendedActivityTypes: ['lesson', 'practical', 'mcq'], contentStatus: 'partial' },
  { id: 'design-layout-hierarchy', slug: 'graphic-design-visual-hierarchy', name: 'Visual Hierarchy & Composition Grids', domain: 'Design and Creative Arts', domainId: 'dom_design', description: 'Focal weight, whitespace balance, Swiss grids, and color accessibility.', difficulty: 'intermediate', estimatedHours: 14, recommendedActivityTypes: ['lesson', 'practical', 'case_study'], contentStatus: 'partial' },
];

export const UNIVERSAL_PREREQUISITES: SkillPrerequisite[] = [
  // CS / Software / AI / Security
  { id: 'e1', skillId: 'js-ts', prerequisiteSkillId: 'prog-fundamentals', strictness: 'required' },
  { id: 'e2', skillId: 'react-ui', prerequisiteSkillId: 'html-css', strictness: 'required' },
  { id: 'e3', skillId: 'react-ui', prerequisiteSkillId: 'js-ts', strictness: 'required' },
  { id: 'e4', skillId: 'node-apis', prerequisiteSkillId: 'js-ts', strictness: 'required' },
  { id: 'e5', skillId: 'node-apis', prerequisiteSkillId: 'sql-databases', strictness: 'recommended' },
  { id: 'e6', skillId: 'python-core', prerequisiteSkillId: 'prog-fundamentals', strictness: 'required' },
  { id: 'e7', skillId: 'dsa-algorithms', prerequisiteSkillId: 'prog-fundamentals', strictness: 'required' },
  { id: 'e8', skillId: 'data-analysis', prerequisiteSkillId: 'python-core', strictness: 'required' },
  { id: 'e9', skillId: 'data-analysis', prerequisiteSkillId: 'math-linear-prob', strictness: 'recommended' },
  { id: 'e10', skillId: 'ml-foundations', prerequisiteSkillId: 'python-core', strictness: 'required' },
  { id: 'e11', skillId: 'ml-foundations', prerequisiteSkillId: 'math-linear-prob', strictness: 'required' },
  { id: 'e12', skillId: 'ml-foundations', prerequisiteSkillId: 'data-analysis', strictness: 'recommended' },
  { id: 'e13', skillId: 'deep-learning-llm', prerequisiteSkillId: 'ml-foundations', strictness: 'required' },
  { id: 'e14', skillId: 'cyber-appsec', prerequisiteSkillId: 'cyber-networking', strictness: 'required' },
  { id: 'e15', skillId: 'cyber-appsec', prerequisiteSkillId: 'node-apis', strictness: 'recommended' },
  { id: 'e16', skillId: 'cs-systems-gate', prerequisiteSkillId: 'dsa-algorithms', strictness: 'required' },
  { id: 'e17', skillId: 'cs-systems-gate', prerequisiteSkillId: 'sql-databases', strictness: 'recommended' },

  // GATE ECE prerequisites
  { id: 'e18', skillId: 'ece-signals-systems', prerequisiteSkillId: 'ece-network-theory', strictness: 'required' },
  { id: 'e19', skillId: 'ece-analog-digital', prerequisiteSkillId: 'ece-network-theory', strictness: 'required' },
  { id: 'e20', skillId: 'ece-control-comm', prerequisiteSkillId: 'ece-signals-systems', strictness: 'required' },

  // Physics prerequisites
  { id: 'e21', skillId: 'phys-mechanics', prerequisiteSkillId: 'phys-math-methods', strictness: 'required' },
  { id: 'e22', skillId: 'phys-electromagnetism', prerequisiteSkillId: 'phys-mechanics', strictness: 'required' },
  { id: 'e23', skillId: 'phys-quantum-intro', prerequisiteSkillId: 'phys-electromagnetism', strictness: 'required' },

  // Business Accounting prerequisites
  { id: 'e24', skillId: 'acct-statements', prerequisiteSkillId: 'acct-basics', strictness: 'required' },
  { id: 'e25', skillId: 'acct-cost-managerial', prerequisiteSkillId: 'acct-statements', strictness: 'required' },

  // Competitive Exam prerequisites
  { id: 'e26', skillId: 'exam-strategy', prerequisiteSkillId: 'exam-quant-reasoning', strictness: 'required' },

  // Graphic Design prerequisites
  { id: 'e27', skillId: 'design-layout-hierarchy', prerequisiteSkillId: 'design-typography', strictness: 'required' },
];

export interface DomainBundle {
  domains?: DomainDefinition[];
  categories?: DomainCategory[];
  subjects?: SubjectDefinition[];
  topics?: TopicDefinition[];
  subtopics?: SubtopicDefinition[];
  skills?: Skill[];
  prerequisites?: SkillPrerequisite[];
  blueprints?: AssessmentBlueprint[];
}

/**
 * Extensible universal domain & skill registry.
 * New domains, subjects, skills, and prerequisites can be registered dynamically
 * without modifying any core engine code.
 */
export class DomainRegistry {
  private readonly domains = new Map<string, DomainDefinition>();
  private readonly categories = new Map<string, DomainCategory>();
  private readonly subjects = new Map<string, SubjectDefinition>();
  private readonly topics = new Map<string, TopicDefinition>();
  private readonly subtopics = new Map<string, SubtopicDefinition>();
  private readonly skills = new Map<string, Skill>();
  private readonly prerequisites = new Map<string, SkillPrerequisite>();
  private readonly blueprints = new Map<string, AssessmentBlueprint>();

  constructor(initialBundle?: DomainBundle) {
    if (initialBundle) {
      this.registerDomainBundle(initialBundle);
    }
  }

  registerDomainBundle(bundle: DomainBundle): void {
    for (const d of bundle.domains ?? []) this.domains.set(d.id, d);
    for (const c of bundle.categories ?? []) this.categories.set(c.id, c);
    for (const s of bundle.subjects ?? []) this.subjects.set(s.id, s);
    for (const t of bundle.topics ?? []) this.topics.set(t.id, t);
    for (const st of bundle.subtopics ?? []) this.subtopics.set(st.id, st);
    for (const sk of bundle.skills ?? []) this.skills.set(sk.id, sk);
    for (const p of bundle.prerequisites ?? []) this.prerequisites.set(p.id, p);
    for (const bp of bundle.blueprints ?? []) this.blueprints.set(bp.id, bp);
  }

  listDomains(): DomainDefinition[] {
    return Array.from(this.domains.values());
  }

  listSubjectsByDomain(domainId: string): SubjectDefinition[] {
    return Array.from(this.subjects.values()).filter((s) => s.domainId === domainId);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getAllPrerequisites(): SkillPrerequisite[] {
    return Array.from(this.prerequisites.values());
  }

  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  getBlueprintForSkill(skillId: string): AssessmentBlueprint | undefined {
    const skill = this.skills.get(skillId);
    if (!skill?.subjectId) return undefined;
    return Array.from(this.blueprints.values()).find((bp) => bp.subjectId === skill.subjectId);
  }

  searchCatalog(query: string): {
    domains: DomainDefinition[];
    subjects: SubjectDefinition[];
    skills: Skill[];
  } {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        domains: this.listDomains(),
        subjects: Array.from(this.subjects.values()),
        skills: this.getAllSkills(),
      };
    }
    return {
      domains: this.listDomains().filter(
        (d) => d.name.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q),
      ),
      subjects: Array.from(this.subjects.values()).filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
      ),
      skills: this.getAllSkills().filter(
        (sk) =>
          sk.name.toLowerCase().includes(q) ||
          sk.domain.toLowerCase().includes(q) ||
          sk.description.toLowerCase().includes(q) ||
          sk.slug.toLowerCase().includes(q),
      ),
    };
  }
}

export const defaultDomainRegistry = new DomainRegistry({
  domains: UNIVERSAL_DOMAINS,
  categories: UNIVERSAL_CATEGORIES,
  subjects: UNIVERSAL_SUBJECTS,
  topics: UNIVERSAL_TOPICS,
  subtopics: UNIVERSAL_SUBTOPICS,
  skills: UNIVERSAL_SKILLS,
  prerequisites: UNIVERSAL_PREREQUISITES,
  blueprints: UNIVERSAL_BLUEPRINTS,
});
