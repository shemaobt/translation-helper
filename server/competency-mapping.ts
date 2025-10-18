/**
 * Qualification-Competency Mapping System
 * 
 * This file defines how qualifications (courses) impact the 11 OBT competencies.
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
 * Qualification patterns that affect the new 11-competency framework
 * When a qualification matches multiple patterns, weights are summed
 */
export const QUALIFICATION_PATTERNS: QualificationPattern[] = [
  // Interpersonal & Team Leadership Skills
  {
    keywords: ['leadership', 'team building', 'conflict resolution', 'active listening', 'empathy', 'facilitation', 'group dynamics'],
    impacts: [
      { competencyId: 'interpersonal_skills', weight: 5 },
      { competencyId: 'consulting_mentoring', weight: 3 },
    ]
  },
  
  // Cross-cultural & Intercultural Communication
  {
    keywords: ['cross-cultural', 'intercultural', 'cultural sensitivity', 'anthropology', 'ethnography', 'cultural adaptation'],
    impacts: [
      { competencyId: 'intercultural_communication', weight: 5 },
      { competencyId: 'interpersonal_skills', weight: 2 },
    ]
  },
  
  // Oral Communication & Multimodal Methods
  {
    keywords: ['oral', 'obt', 'oral bible translation', 'storytelling', 'narrative', 'multimodal', 'embodied learning', 'gestures', 'visual communication'],
    impacts: [
      { competencyId: 'multimodal_skills', weight: 5 },
      { competencyId: 'translation_theory', weight: 3 },
    ]
  },
  
  // Translation Theory & Linguistics
  {
    keywords: ['translation', 'linguistics', 'translation theory', 'phonetics', 'phonology', 'morphology', 'syntax', 'semantics', 'discourse analysis'],
    impacts: [
      { competencyId: 'translation_theory', weight: 5 },
      { competencyId: 'languages_communication', weight: 4 },
    ]
  },
  
  // Languages & Communication (Semantics, Pragmatics, Metaphor)
  {
    keywords: ['semantics', 'pragmatics', 'metaphor', 'discourse', 'communication theory', 'linguistic analysis', 'language structure'],
    impacts: [
      { competencyId: 'languages_communication', weight: 5 },
      { competencyId: 'translation_theory', weight: 3 },
    ]
  },
  
  // Biblical Languages (Hebrew, Greek, Aramaic)
  {
    keywords: ['hebrew', 'greek', 'aramaic', 'biblical language', 'exegesis', 'original languages'],
    impacts: [
      { competencyId: 'biblical_languages', weight: 5 },
      { competencyId: 'biblical_studies', weight: 3 },
    ]
  },
  
  // Biblical Studies & Theology
  {
    keywords: ['bible', 'biblical', 'theology', 'theological', 'scripture', 'hermeneutics', 'biblical interpretation'],
    impacts: [
      { competencyId: 'biblical_studies', weight: 5 },
      { competencyId: 'biblical_languages', weight: 2 },
    ]
  },
  
  // Planning & Quality Assurance
  {
    keywords: ['project management', 'planning', 'quality assurance', 'qa', 'quality control', 'project planning', 'scheduling', 'budgeting'],
    impacts: [
      { competencyId: 'planning_quality', weight: 5 },
      { competencyId: 'consulting_mentoring', weight: 2 },
    ]
  },
  
  // Consulting & Mentoring
  {
    keywords: ['mentor', 'mentoring', 'mentorship', 'coaching', 'consulting', 'training', 'teaching', 'discipleship', 'servant leadership'],
    impacts: [
      { competencyId: 'consulting_mentoring', weight: 5 },
      { competencyId: 'interpersonal_skills', weight: 3 },
    ]
  },
  
  // Applied Technology
  {
    keywords: ['technology', 'audio recording', 'editing', 'digital tools', 'software', 'ai', 'artificial intelligence', 'remote collaboration', 'digital literacy'],
    impacts: [
      { competencyId: 'applied_technology', weight: 5 },
      { competencyId: 'multimodal_skills', weight: 2 },
    ]
  },
  
  // Reflective Practice & Self-awareness
  {
    keywords: ['reflective practice', 'self-awareness', 'emotional intelligence', 'self-regulation', 'personal growth', 'feedback', 'introspection'],
    impacts: [
      { competencyId: 'reflective_practice', weight: 5 },
      { competencyId: 'interpersonal_skills', weight: 3 },
    ]
  },
  
  // YWAM Specific Courses
  {
    keywords: ['dts', 'discipleship training school', 'ywam', 'youth with a mission'],
    impacts: [
      { competencyId: 'biblical_studies', weight: 4 },
      { competencyId: 'intercultural_communication', weight: 3 },
      { competencyId: 'consulting_mentoring', weight: 3 },
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
    const impactEntries = Array.from(impacts.entries());
    for (const [competencyId, weight] of impactEntries) {
      const currentScore = competencyScores.get(competencyId) || 0;
      competencyScores.set(competencyId, currentScore + weight);
    }
  }
  
  return competencyScores;
}
