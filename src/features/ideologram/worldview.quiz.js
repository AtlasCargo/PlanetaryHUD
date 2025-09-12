const worldviewQuiz = [
  // Economic Literacy & Philosophy
  {
    id: 'econ_1',
    category: 'economic_literacy',
    question: 'How would you describe your understanding of free market economics?',
    type: 'scale',
    options: ['No understanding', 'Basic', 'Intermediate', 'Advanced', 'Expert'],
    weight: 1.2
  },
  {
    id: 'econ_2', 
    category: 'economic_literacy',
    question: 'Do you believe in the efficiency of central planning vs. market mechanisms?',
    type: 'scale',
    options: ['Strongly prefer central planning', 'Somewhat prefer central planning', 'Neutral', 'Somewhat prefer markets', 'Strongly prefer markets'],
    weight: 1.0
  },

  // Philosophical Sophistication
  {
    id: 'phil_1',
    category: 'philosophical_sophistication', 
    question: 'Have you studied formal philosophy or ethics?',
    type: 'scale',
    options: ['Never studied', 'Basic courses', 'Undergraduate level', 'Graduate level', 'Academic research'],
    weight: 1.5
  },
  {
    id: 'phil_2',
    category: 'philosophical_sophistication',
    question: 'How would you describe your epistemological position?',
    type: 'text',
    placeholder: 'e.g., "Empiricist", "Rationalist", "Pragmatist", "Skeptic"...',
    weight: 1.3
  },

  // Scientific Literacy
  {
    id: 'sci_1',
    category: 'scientific_literacy',
    question: 'How would you rate your understanding of basic physics?',
    type: 'scale',
    options: ['No understanding', 'High school level', 'Undergraduate level', 'Graduate level', 'Research level'],
    weight: 1.1
  },
  {
    id: 'sci_2',
    category: 'scientific_literacy',
    question: 'What is your view on climate change science?',
    type: 'scale',
    options: ['Deny the science', 'Skeptical', 'Accept with reservations', 'Accept the consensus', 'Expert understanding'],
    weight: 1.4
  },

  // Psychological Insight
  {
    id: 'psych_1',
    category: 'psychological_insight',
    question: 'How well do you understand human motivation and behavior?',
    type: 'scale',
    options: ['No understanding', 'Basic intuition', 'Some study', 'Formal training', 'Expert level'],
    weight: 1.0
  },

  // Historical Perspective
  {
    id: 'hist_1',
    category: 'historical_perspective',
    question: 'How would you rate your historical knowledge?',
    type: 'scale',
    options: ['Minimal', 'Basic', 'Good', 'Excellent', 'Academic level'],
    weight: 1.0
  }
];

export default worldviewQuiz;



