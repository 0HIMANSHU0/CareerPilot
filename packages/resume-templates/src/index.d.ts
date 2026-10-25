import type { ResumeData, ResumeTemplateId } from '@careerpilot/shared';

export declare function renderResume(
  resumeData: ResumeData,
  templateId: ResumeTemplateId,
  options?: { summaryIsHtml?: boolean },
): string;
export declare function listTemplates(): { id: ResumeTemplateId; name: string }[];
