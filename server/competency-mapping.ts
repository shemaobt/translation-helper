/**
 * Qualification-Competency Mapping System
 * 
 * This file defines how qualifications (courses) impact OBT competencies.
 * Each mapping includes keywords to match in course titles and the competency impact weights.
 */

export interface CompetencyImpact {
  competencyId: string;
  weight: number; // 1-5, where 1=low impact, 5=high impact
}

export interface QualificationPattern {
  keywords: string[]; // Keywords to match in course title (case-insensitive)
  impacts: CompetencyImpact[];
}

/**
 * Qualification patterns that affect competencies
 * When a qualification matches multiple patterns, weights are summed
 */
export const QUALIFICATION_PATTERNS: QualificationPattern[] = [
  // Biblical Languages (Hebrew, Greek, Aramaic)
  {
    keywords: ['hebrew', 'greek', 'aramaic', 'biblical language'],
    impacts: [
      { competencyId: 'biblical_knowledge', weight: 5 },
      { competencyId: 'translation_theory', weight: 3 },
    ]
  },
  
  // Bible Studies & Theology
  {
    keywords: ['bible', 'biblical', 'theology', 'theological', 'scripture'],
    impacts: [
      { competencyId: 'biblical_knowledge', weight: 4 },
      { competencyId: 'spiritual_formation', weight: 3 },
    ]
  },
  
  // Linguistics & Translation Theory
  {
    keywords: ['linguistic', 'translation', 'phonetic', 'phonology', 'morphology', 'syntax', 'semantics'],
    impacts: [
      { competencyId: 'translation_theory', weight: 5 },
      { competencyId: 'oral_methods', weight: 2 },
    ]
  },
  
  // Oral Communication & OBT Methods
  {
    keywords: ['oral', 'obt', 'oral bible translation', 'storytelling', 'narrative'],
    impacts: [
      { competencyId: 'oral_methods', weight: 5 },
      { competencyId: 'translation_theory', weight: 3 },
    ]
  },
  
  // Teaching & Facilitation
  {
    keywords: ['teaching', 'facilitation', 'training', 'pedagogy', 'education', 'trainer'],
    impacts: [
      { competencyId: 'facilitation_skills', weight: 5 },
      { competencyId: 'mentorship_practice', weight: 3 },
    ]
  },
  
  // Cross-cultural & Intercultural Communication
  {
    keywords: ['cross-cultural', 'intercultural', 'cultural sensitivity', 'anthropology', 'ethnography'],
    impacts: [
      { competencyId: 'intercultural_communication', weight: 5 },
      { competencyId: 'facilitation_skills', weight: 2 },
    ]
  },
  
  // Project Management & Leadership
  {
    keywords: ['project management', 'leadership', 'management', 'administration', 'planning'],
    impacts: [
      { competencyId: 'project_management', weight: 5 },
      { competencyId: 'facilitation_skills', weight: 2 },
    ]
  },
  
  // Mentorship & Coaching
  {
    keywords: ['mentor', 'mentoring', 'mentorship', 'coaching', 'discipleship'],
    impacts: [
      { competencyId: 'mentorship_practice', weight: 5 },
      { competencyId: 'spiritual_formation', weight: 3 },
    ]
  },
  
  // Spiritual Formation & Ministry
  {
    keywords: ['spiritual formation', 'discipleship', 'ministry', 'pastoral', 'mission', 'missionary'],
    impacts: [
      { competencyId: 'spiritual_formation', weight: 5 },
      { competencyId: 'biblical_knowledge', weight: 2 },
    ]
  },
  
  // YWAM Specific Courses
  {
    keywords: ['dts', 'discipleship training school', 'ywam', 'youth with a mission'],
    impacts: [
      { competencyId: 'spiritual_formation', weight: 4 },
      { competencyId: 'intercultural_communication', weight: 3 },
      { competencyId: 'biblical_knowledge', weight: 3 },
    ]
  },
];

/**
 * Calculate competency impacts for a given qualification
 */
export function calculateQualificationImpacts(
  courseTitle: string,
  description?: string | null
): Map<string, number> {
  const impacts = new Map<string, number>();
  const searchText = `${courseTitle} ${description || ''}`.toLowerCase();
  
  // Check each pattern
  for (const pattern of QUALIFICATION_PATTERNS) {
    // Check if any keyword matches
    const matches = pattern.keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    
    if (matches) {
      // Add this pattern's impacts
      for (const impact of pattern.impacts) {
        const currentWeight = impacts.get(impact.competencyId) || 0;
        impacts.set(impact.competencyId, currentWeight + impact.weight);
      }
    }
  }
  
  return impacts;
}

/**
 * Convert accumulated weight to competency status level
 * Thresholds:
 * - 0: not_started
 * - 1-3: emerging
 * - 4-7: growing  
 * - 8-12: proficient
 * - 13+: advanced
 */
export function scoreToStatus(score: number): string {
  if (score === 0) return 'not_started';
  if (score <= 3) return 'emerging';
  if (score <= 7) return 'growing';
  if (score <= 12) return 'proficient';
  return 'advanced';
}

/**
 * Calculate all competency scores for a facilitator based on their qualifications
 */
export function calculateCompetencyScores(
  qualifications: Array<{ courseTitle: string; description?: string | null }>
): Map<string, number> {
  const competencyScores = new Map<string, number>();
  
  // Process each qualification
  for (const qualification of qualifications) {
    const impacts = calculateQualificationImpacts(
      qualification.courseTitle,
      qualification.description
    );
    
    // Accumulate impacts into total scores
    for (const [competencyId, weight] of impacts.entries()) {
      const currentScore = competencyScores.get(competencyId) || 0;
      competencyScores.set(competencyId, currentScore + weight);
    }
  }
  
  return competencyScores;
}
