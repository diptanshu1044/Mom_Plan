import { prisma } from '../../config/prisma';

function currentQuarter(): string {
  const m = new Date().getMonth();
  if (m < 3) return 'Q1';
  if (m < 6) return 'Q2';
  if (m < 9) return 'Q3';
  return 'Q4';
}

export async function resolveSubmissionGeneratedPdfId(
  applicationId: string,
  userId: string,
  programId: string,
  attachPdf: boolean
): Promise<string | null> {
  if (!attachPdf) return null;

  const pdf =
    (await prisma.generatedPdf.findFirst({
      where: { application_id: applicationId, user_id: userId },
      orderBy: { generated_at: 'desc' },
    })) ??
    (await prisma.generatedPdf.findFirst({
      where: { user_id: userId, program_id: programId },
      orderBy: { generated_at: 'desc' },
    }));

  return pdf?.id ?? null;
}

/**
 * After a mom sends a secure application email, sync the partner portal case
 * and store only the documents that were attached to that submission.
 */
export async function syncPartnerPortalOnSecureSubmission(params: {
  applicationId: string;
  userId: string;
  generatedPdfId: string | null;
  documentIds: string[];
}) {
  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: {
      program: true,
      user: { include: { mother_profile: true } },
    },
  });

  if (!application?.program_id || !application.user?.org_id) return;

  const mother = application.user.mother_profile;
  if (!mother) return;

  const orgId = application.user.org_id;
  const submittedAt = new Date();
  const resolvedDocIds = [...new Set(params.documentIds)];

  const submission = await prisma.applicationSubmission.create({
    data: {
      application_id: params.applicationId,
      user_id: params.userId,
      generated_pdf_id: params.generatedPdfId,
      document_ids: resolvedDocIds,
      submitted_at: submittedAt,
    },
  });

  let partnerCase = await prisma.partnerCase.findFirst({
    where: {
      mother_id: mother.id,
      program_id: application.program_id,
      OR: [
        { caseworker: { org_id: orgId } },
        { mother: { user: { org_id: orgId } } },
      ],
    },
    orderBy: { created_at: 'desc' },
  });

  if (!partnerCase) {
    partnerCase = await prisma.partnerCase.create({
      data: {
        mother_id: mother.id,
        caseworker_id: mother.caseworker_id,
        program_id: application.program_id,
        status: 'submitted',
        urgency_level: 'normal',
        quarter: currentQuarter(),
        intake_date: new Date(),
        application_id: params.applicationId,
        secure_submitted_at: submittedAt,
        last_activity: submittedAt,
      },
    });

    await prisma.statusHistory.create({
      data: {
        case_id: partnerCase.id,
        old_status: null,
        new_status: 'submitted',
        changed_by: null,
        notes: `Secure application submitted for ${application.program?.name ?? 'benefit program'}`,
      },
    });
  } else {
    const previousStatus = partnerCase.status;
    partnerCase = await prisma.partnerCase.update({
      where: { id: partnerCase.id },
      data: {
        application_id: params.applicationId,
        secure_submitted_at: submittedAt,
        status: partnerCase.status === 'approved' ? 'approved' : 'submitted',
        last_activity: submittedAt,
      },
    });

    if (previousStatus !== partnerCase.status) {
      await prisma.statusHistory.create({
        data: {
          case_id: partnerCase.id,
          old_status: previousStatus,
          new_status: partnerCase.status,
          changed_by: null,
          notes: `Secure application submitted for ${application.program?.name ?? 'benefit program'}`,
        },
      });
    }

    await prisma.communication.create({
      data: {
        case_id: partnerCase.id,
        sent_by: null,
        type: 'application_submitted',
        channel: 'email',
        message: `Secure application package sent for ${application.program?.name ?? 'benefit program'}`,
        sent_at: submittedAt,
        delivery_status: 'sent',
      },
    });
  }

  await prisma.caseDocument.deleteMany({ where: { case_id: partnerCase.id } });

  const caseDocuments: {
    case_id: string;
    doc_type: string;
    file_url: string;
    review_status: 'approved';
    uploaded_at: Date;
  }[] = [];

  if (params.generatedPdfId) {
    const pdf = await prisma.generatedPdf.findUnique({
      where: { id: params.generatedPdfId },
      include: { program: true },
    });
    if (pdf) {
      caseDocuments.push({
        case_id: partnerCase.id,
        doc_type: 'application_package',
        file_url: pdf.file_url,
        review_status: 'approved',
        uploaded_at: submission.submitted_at,
      });
    }
  }

  if (resolvedDocIds.length > 0) {
    const docs = await prisma.document.findMany({
      where: { id: { in: resolvedDocIds }, user_id: params.userId },
    });
    for (const doc of docs) {
      if (doc.document_type === 'application_package' && params.generatedPdfId) continue;
      caseDocuments.push({
        case_id: partnerCase.id,
        doc_type: doc.document_type,
        file_url: doc.file_url,
        review_status: 'approved',
        uploaded_at: submission.submitted_at,
      });
    }
  }

  if (caseDocuments.length > 0) {
    await prisma.caseDocument.createMany({ data: caseDocuments });
  }

  if (mother.enrollment_status === 'pending') {
    await prisma.mother.update({
      where: { id: mother.id },
      data: { enrollment_status: 'enrolled' },
    });
  }
}
