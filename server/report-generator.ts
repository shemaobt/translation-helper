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
      text: "RELATÓRIO TRIMESTRAL DE MENTORIA",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      text: `Período: ${periodStart.toLocaleDateString('pt-BR')} a ${periodEnd.toLocaleDateString('pt-BR')}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Facilitator Info
  sections.push(
    new Paragraph({
      text: "Informações do Facilitador",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Região: ", bold: true }),
        new TextRun(facilitator.region || "Não especificado"),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Supervisor: ", bold: true }),
        new TextRun(facilitator.mentorSupervisor || "Não especificado"),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Total de Línguas Mentoreadas: ", bold: true }),
        new TextRun(facilitator.totalLanguagesMentored.toString()),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Total de Capítulos Mentoreados: ", bold: true }),
        new TextRun(facilitator.totalChaptersMentored.toString()),
      ],
      spacing: { after: 400 },
    })
  );

  // Competencies Progress
  sections.push(
    new Paragraph({
      text: "Progresso nas Competências",
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
            new TextRun({ text: `${comp.definition.namePt}: `, bold: true }),
            new TextRun(translateStatus(comp.status)),
          ],
          spacing: { after: 100 },
        })
      );
    }
  });

  sections.push(new Paragraph({ text: "", spacing: { after: 300 } }));

  // Qualifications
  if (qualifications.length > 0) {
    sections.push(
      new Paragraph({
        text: "Qualificações Formais",
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
        text: "Atividades e Experiências",
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
            text: `  Notas: ${activity.notes}`,
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
      text: "Resumo das Conversas de Mentoria",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: `Durante este período, o facilitador participou de ${Math.floor(recentMessages.filter(m => m.role === 'user').length / 2)} sessões de mentoria, demonstrando engajamento ativo no desenvolvimento de suas competências.`,
      spacing: { after: 200 },
    })
  );

  // Key topics discussed (extract from messages)
  const userMessages = recentMessages.filter(m => m.role === 'user');
  if (userMessages.length > 0) {
    sections.push(
      new Paragraph({
        text: "Tópicos principais abordados:",
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: "Tópicos principais abordados:", bold: true })],
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
      text: "Próximos Passos",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "O facilitador deve continuar desenvolvendo suas competências através de prática contínua, feedback regular e participação em atividades de mentoria. Recomenda-se manter o diálogo ativo com o supervisor e buscar oportunidades de aplicar os conhecimentos adquiridos.",
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
  
  const fileName = `relatorio-${facilitator.id}-${periodStart.getTime()}.docx`;
  const filePath = path.join(reportsDir, fileName);

  return { filePath, document: doc };
}

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    not_started: "Não iniciado",
    emerging: "Emergente",
    growing: "Em crescimento",
    proficient: "Proficiente",
    advanced: "Avançado"
  };
  return translations[status] || status;
}

function getActivityLabel(activity: MentorshipActivity): string {
  if (activity.activityType === 'translation' && activity.languageName) {
    return `Tradução em ${activity.languageName} (${activity.chaptersCount || 0} capítulos)`;
  }
  
  const typeLabels: Record<string, string> = {
    facilitation: 'Facilitação OBT',
    teaching: 'Ensino',
    indigenous_work: 'Trabalho com Povos Indígenas',
    school_work: 'Trabalho em Escolas',
    general_experience: 'Experiência Geral'
  };
  
  const typeLabel = typeLabels[activity.activityType || ''] || 'Atividade';
  
  if (activity.title) {
    return `${activity.title} - ${typeLabel}`;
  }
  
  if (activity.yearsOfExperience) {
    return `${typeLabel} (${activity.yearsOfExperience} anos)`;
  }
  
  return typeLabel;
}
