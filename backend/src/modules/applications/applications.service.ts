import { joinFullName, userNameSelect } from '../../utils/name.utils';
import { prisma } from '../../config/prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { sendEmail } from '../../config/email';
import { ApplicationStatus, ApplicationPriority, UserRole } from '@prisma/client';
import { getQuarterForMonth } from '../programs/quarterDueDates.service';
import { Quarter } from '../programs/quarterDueDates.types';

function resolvePdfQuarterYearFilters(quarter?: string, year?: number) {
  const now = new Date();
  const resolvedQuarter =
    quarter && ['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)
      ? (quarter as Quarter)
      : getQuarterForMonth(now.getUTCMonth() + 1);
  const resolvedYear = year ?? now.getUTCFullYear();
  return { quarter: resolvedQuarter, year: resolvedYear };
}

function generatedPdfsInclude(quarter?: string, year?: number, filterByQuarter = false) {
  const pdfWhere = filterByQuarter
    ? resolvePdfQuarterYearFilters(quarter, year)
    : undefined;

  return {
    generated_pdfs: {
      ...(pdfWhere ? { where: pdfWhere } : {}),
      orderBy: { generated_at: 'desc' as const },
    },
  };
}

export class ApplicationsService {
  async listApplications(
    userId: string,
    role: UserRole,
    filters?: { quarter?: string; year?: number; filter_pdfs_by_quarter?: boolean }
  ) {
    const pdfInclude = generatedPdfsInclude(
      filters?.quarter,
      filters?.year,
      filters?.filter_pdfs_by_quarter ?? false
    );

    if (role === 'admin' || role === 'counselor') {
      return prisma.application.findMany({
        include: {
          program: true,
          user: {
            select: { ...userNameSelect, email: true },
          },
          ...pdfInclude,
        },
        orderBy: [{ priority: 'desc' }, { last_updated_at: 'desc' }],
      });
    }

    return prisma.application.findMany({
      where: { user_id: userId },
      include: {
        program: true,
        ...pdfInclude,
      },
      orderBy: { last_updated_at: 'desc' },
    });
  }

  async getApplicationById(id: string, userId: string, role: UserRole) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        program: true,
        documents: true,
        deadlines: true,
        user: { select: { ...userNameSelect, email: true } },
        generated_pdfs: {
          orderBy: { generated_at: 'desc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (role === 'user' && application.user_id !== userId) {
      throw new ForbiddenError('Access denied to this application');
    }

    return application;
  }

  async createApplication(
    userId: string,
    data: { program_id: string; notes?: string; priority?: ApplicationPriority }
  ) {
    // Check if program exists
    const program = await prisma.benefitProgram.findUnique({
      where: { id: data.program_id },
    });

    if (!program) {
      throw new NotFoundError('Benefit program not found');
    }

    const application = await prisma.application.create({
      data: {
        user_id: userId,
        program_id: data.program_id,
        notes: data.notes,
        priority: data.priority || 'normal',
        status: 'draft',
      },
      include: {
        program: true,
      },
    });

    // Link any existing unlinked generated PDFs for this program to the new application
    await prisma.generatedPdf.updateMany({
      where: {
        user_id: userId,
        program_id: data.program_id,
        application_id: null,
      },
      data: {
        application_id: application.id,
      },
    });

    // Refetch the application with its relations to include generated_pdfs
    const fullApplication = await prisma.application.findUnique({
      where: { id: application.id },
      include: {
        program: true,
        generated_pdfs: {
          orderBy: { generated_at: 'desc' },
        },
      },
    });

    return fullApplication || application;
  }

  async updateApplication(
    id: string,
    userId: string,
    role: UserRole,
    data: {
      status?: ApplicationStatus;
      notes?: string | null;
      priority?: ApplicationPriority;
      assigned_admin_id?: string | null;
    }
  ) {
    const existing = await prisma.application.findUnique({
      where: { id },
      include: { user: true, program: true },
    });

    if (!existing) {
      throw new NotFoundError('Application not found');
    }

    // Normal users can only update their own notes or submit/withdraw
    if (role === 'user') {
      if (existing.user_id !== userId) {
        throw new ForbiddenError('Access denied');
      }
      if (data.status && !['submitted', 'withdrawn', 'draft'].includes(data.status)) {
        throw new ForbiddenError('Users can only set application status to draft, submitted, or withdrawn');
      }
      // Users cannot reassign admins or change priority
      delete data.assigned_admin_id;
      delete data.priority;
    }

    const isStatusChanged = data.status && data.status !== existing.status;
    const isNewlySubmitted = data.status === 'submitted' && existing.status !== 'submitted';

    const updatePayload: any = { ...data };
    if (isNewlySubmitted) {
      updatePayload.submitted_at = new Date();
    }

    const updated = await prisma.application.update({
      where: { id },
      data: updatePayload,
      include: { program: true, user: true },
    });

    // If status changed, send email notification and create DB notification
    if (isStatusChanged) {
      const programName = updated.program?.name || 'Assistance Program';
      const statusTitle = `Application Status Updated: ${updated.status.replace('_', ' ').toUpperCase()}`;
      const statusMsg = `Your application for ${programName} has been updated to status: ${updated.status.replace('_', ' ')}.`;

      // Create internal notification
      await prisma.notification.create({
        data: {
          user_id: updated.user_id,
          type: 'status_update',
          title: statusTitle,
          message: statusMsg,
          related_application_id: updated.id,
        },
      });

      // Send email
      await sendEmail({
        to: updated.user.email,
        subject: `MomPlan Application Update: ${programName}`,
        html: `<h1>Application Status Update</h1>
        <p>Hello ${joinFullName(updated.user.first_name, updated.user.middle_name, updated.user.last_name)},</p>
        <p>${statusMsg}</p>
        ${updated.notes ? `<p><strong>Notes:</strong> ${updated.notes}</p>` : ''}
        <p>Log in to your dashboard to view complete details and any requested documents.</p>`,
      });
    }

    return updated;
  }

  async deleteApplication(id: string, userId: string, role: UserRole) {
    const existing = await prisma.application.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Application not found');
    }

    if (role === 'user' && existing.user_id !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.application.delete({
      where: { id },
    });
  }
}
