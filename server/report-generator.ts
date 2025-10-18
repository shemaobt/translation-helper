import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import type { Facilitator, FacilitatorCompetency, FacilitatorQualification, MentorshipActivity, Message } from '@shared/schema';
import { CORE_COMPETENCIES } from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';

interface ReportData {
  facilitator: Facilitator;
  competencies: FacilitatorCompetency[];
  qualifications: FacilitatorQualification[];
  activities: MentorshipActivity[];
  recentMessages: Message[];
  periodStart: Date;
  periodEnd: Date;
}

export async function generateQuarterlyReport(data: ReportData): Promise<{ filePath: string; document: Document }> {
  const { facilitator, competencies, qualifications, activities, recentMessages, periodStart, periodEnd } = data;

  // Create document sections
  const sections: Paragraph[] = [];

  // Header
  sections.push(
    new Paragraph({
      text: "QUARTERLY MENTORSHIP REPORT",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      text: `Period: ${periodStart.toLocaleDateString('en-US')} to ${periodEnd.toLocaleDateString('en-US')}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Facilitator Info
  sections.push(
    new Paragraph({
      text: "Facilitator Information",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Region: ", bold: true }),
        new TextRun(facilitator.region || "Not specified"),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Supervisor: ", bold: true }),
        new TextRun(facilitator.mentorSupervisor || "Not specified"),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Total Languages Mentored: ", bold: true }),
        new TextRun(facilitator.totalLanguagesMentored.toString()),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Total Chapters Mentored: ", bold: true }),
        new TextRun(facilitator.totalChaptersMentored.toString()),
      ],
      spacing: { after: 400 },
    })
  );

  // Competencies Progress
  sections.push(
    new Paragraph({
      text: "Competency Progress",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  );

  const competenciesWithData = competencies.map(comp => {
    const competencyDef = Object.values(CORE_COMPETENCIES).find((c: any) => c.id === comp.competencyId);
    return { ...comp, definition: competencyDef };
  });

  competenciesWithData.forEach(comp => {
    if (comp.definition) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${comp.definition.name}: `, bold: true }),
            new TextRun(translateStatus(comp.status)),
          ],
          spacing: { after: 100 },
        })
      );
    }
  });

  sections.push(new Paragraph({ text: "", spacing: { after: 300 } }));

  // Progress Narrative
  sections.push(
    new Paragraph({
      text: "Progress Narrative",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  );

  // Generate narrative based on competency levels
  const proficientCount = competencies.filter(c => c.status === 'proficient' || c.status === 'advanced').length;
  const growingCount = competencies.filter(c => c.status === 'growing').length;
  const emergingCount = competencies.filter(c => c.status === 'emerging').length;
  const totalCompetencies = Object.keys(CORE_COMPETENCIES).length;
  
  let narrativeParagraphs: Paragraph[] = [];
  
  // Opening paragraph
  narrativeParagraphs.push(
    new Paragraph({
      text: `This report summarizes the mentorship journey of the facilitator during the period from ${periodStart.toLocaleDateString('en-US')} to ${periodEnd.toLocaleDateString('en-US')}. The facilitator has demonstrated commitment to developing the core competencies necessary for effective OBT mentorship.`,
      spacing: { after: 200 },
    })
  );

  // Competency progress narrative
  if (proficientCount > 0) {
    const percentage = Math.round((proficientCount / totalCompetencies) * 100);
    narrativeParagraphs.push(
      new Paragraph({
        text: `The facilitator has achieved proficiency in ${proficientCount} of ${totalCompetencies} core competencies (${percentage}%), demonstrating readiness in key areas of OBT facilitation. This level of competency indicates the facilitator is well-equipped to mentor translation teams effectively.`,
        spacing: { after: 200 },
      })
    );
  }

  if (growingCount > 0) {
    narrativeParagraphs.push(
      new Paragraph({
        text: `${growingCount} competenc${growingCount === 1 ? 'y is' : 'ies are'} currently in the growing stage, showing steady development and increasing capability. Continued practice and mentorship will help solidify these skills into full proficiency.`,
        spacing: { after: 200 },
      })
    );
  }

  if (emergingCount > 0) {
    narrativeParagraphs.push(
      new Paragraph({
        text: `${emergingCount} competenc${emergingCount === 1 ? 'y is' : 'ies are'} in the emerging stage, representing areas of recent development or initial exposure. These competencies would benefit from focused attention and additional practice opportunities.`,
        spacing: { after: 200 },
      })
    );
  }

  // Qualifications narrative
  if (qualifications.length > 0) {
    narrativeParagraphs.push(
      new Paragraph({
        text: `The facilitator has completed ${qualifications.length} formal qualification${qualifications.length === 1 ? '' : 's'}, providing a solid educational foundation for their mentorship work. These credentials demonstrate commitment to professional development and mastery of essential knowledge areas.`,
        spacing: { after: 200 },
      })
    );
  }

  // Activities narrative
  if (activities.length > 0) {
    const translationActivities = activities.filter(a => a.activityType === 'translation' || !a.activityType);
    const experienceActivities = activities.filter(a => a.activityType && a.activityType !== 'translation');
    
    if (translationActivities.length > 0) {
      narrativeParagraphs.push(
        new Paragraph({
          text: `The facilitator has been actively engaged in ${translationActivities.length} translation activit${translationActivities.length === 1 ? 'y' : 'ies'}, working with ${facilitator.totalLanguagesMentored} language${facilitator.totalLanguagesMentored === 1 ? '' : 's'} and completing ${facilitator.totalChaptersMentored} chapter${facilitator.totalChaptersMentored === 1 ? '' : 's'}. This hands-on experience is invaluable for developing practical mentorship skills.`,
          spacing: { after: 200 },
        })
      );
    }
    
    if (experienceActivities.length > 0) {
      narrativeParagraphs.push(
        new Paragraph({
          text: `Additionally, the facilitator brings ${experienceActivities.length} other professional experience${experienceActivities.length === 1 ? '' : 's'} to their mentorship role, enriching their ability to guide teams through diverse challenges and contexts.`,
          spacing: { after: 200 },
        })
      );
    }
  }

  // Engagement narrative
  const sessionCount = Math.floor(recentMessages.filter(m => m.role === 'user').length / 2);
  if (sessionCount > 0) {
    narrativeParagraphs.push(
      new Paragraph({
        text: `Throughout this reporting period, the facilitator participated in ${sessionCount} mentorship session${sessionCount === 1 ? '' : 's'}, engaging actively with the OBT Mentor Assistant to refine their understanding and approach. This consistent engagement demonstrates dedication to continuous improvement and reflective practice.`,
        spacing: { after: 200 },
      })
    );
  }

  // Closing paragraph
  narrativeParagraphs.push(
    new Paragraph({
      text: `Overall, the facilitator shows promising development as an OBT mentor. With continued practice, regular feedback, and engagement in mentorship opportunities, they are positioned to make meaningful contributions to Bible translation work and effectively guide translation teams toward excellence.`,
      spacing: { after: 400 },
    })
  );

  sections.push(...narrativeParagraphs);

  // Qualifications
  if (qualifications.length > 0) {
    sections.push(
      new Paragraph({
        text: "Formal Qualifications",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    qualifications.forEach(qual => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "• ", bold: true }),
            new TextRun({ text: qual.courseTitle, bold: true }),
            new TextRun(` - ${qual.institution}`),
            qual.completionDate ? new TextRun(` (${new Date(qual.completionDate).getFullYear()})`) : new TextRun(""),
          ],
          spacing: { after: 100 },
        })
      );
      if (qual.description) {
        sections.push(
          new Paragraph({
            text: `  ${qual.description}`,
            spacing: { after: 200 },
          })
        );
      }
    });

    sections.push(new Paragraph({ text: "", spacing: { after: 300 } }));
  }

  // Activities
  if (activities.length > 0) {
    sections.push(
      new Paragraph({
        text: "Activities and Experience",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    activities.forEach(activity => {
      const activityLabel = getActivityLabel(activity);
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "• ", bold: true }),
            new TextRun({ text: activityLabel, bold: true }),
          ],
          spacing: { after: 100 },
        })
      );
      
      if (activity.description) {
        sections.push(
          new Paragraph({
            text: `  ${activity.description}`,
            spacing: { after: 100 },
          })
        );
      }
      
      if (activity.notes) {
        sections.push(
          new Paragraph({
            text: `  Notes: ${activity.notes}`,
            spacing: { after: 200 },
          })
        );
      }
    });

    sections.push(new Paragraph({ text: "", spacing: { after: 300 } }));
  }

  // Summary of Conversations
  sections.push(
    new Paragraph({
      text: "Mentorship Conversation Summary",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: `During this period, the facilitator participated in ${Math.floor(recentMessages.filter(m => m.role === 'user').length / 2)} mentorship sessions, demonstrating active engagement in developing their competencies.`,
      spacing: { after: 200 },
    })
  );

  // Key topics discussed (extract from messages)
  const userMessages = recentMessages.filter(m => m.role === 'user');
  if (userMessages.length > 0) {
    sections.push(
      new Paragraph({
        text: "Key Topics Addressed:",
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: "Key Topics Addressed:", bold: true })],
      })
    );

    // Take up to 5 recent user messages as conversation highlights
    userMessages.slice(0, 5).forEach(msg => {
      const preview = msg.content.substring(0, 150) + (msg.content.length > 150 ? '...' : '');
      sections.push(
        new Paragraph({
          text: `• ${preview}`,
          spacing: { after: 100 },
        })
      );
    });
  }

  // Conclusion
  sections.push(
    new Paragraph({
      text: "Next Steps",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "The facilitator should continue developing their competencies through continuous practice, regular feedback, and participation in mentoring activities. It is recommended to maintain active dialogue with the supervisor and seek opportunities to apply acquired knowledge.",
      spacing: { after: 400 },
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  // Save document
  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const fileName = `report-${facilitator.id}-${periodStart.getTime()}.docx`;
  const filePath = path.join(reportsDir, fileName);

  return { filePath, document: doc };
}

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    not_started: "Not Started",
    emerging: "Emerging",
    growing: "Growing",
    proficient: "Proficient",
    advanced: "Advanced"
  };
  return translations[status] || status;
}

function getActivityLabel(activity: MentorshipActivity): string {
  if (activity.activityType === 'translation' && activity.languageName) {
    return `Translation in ${activity.languageName} (${activity.chaptersCount || 0} chapters)`;
  }
  
  const typeLabels: Record<string, string> = {
    facilitation: 'OBT Facilitation',
    teaching: 'Teaching',
    indigenous_work: 'Work with Indigenous Peoples',
    school_work: 'School Work',
    general_experience: 'General Experience'
  };
  
  const typeLabel = typeLabels[activity.activityType || ''] || 'Activity';
  
  if (activity.title) {
    return `${activity.title} - ${typeLabel}`;
  }
  
  if (activity.yearsOfExperience) {
    return `${typeLabel} (${activity.yearsOfExperience} years)`;
  }
  
  return typeLabel;
}
