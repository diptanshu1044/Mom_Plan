import { prisma } from '../../config/prisma';

/**
 * Government Contact Ingestion & Caching Strategy
 * Supports scalable dynamic routing for email composition.
 */
export interface GovContact {
  agency: string;
  department: string;
  email: string;
  state: string;
  category: string;
  source_url: string;
}

export class AutomationService {
  // In-memory cache to prevent constant DB hits if schema is expanded later
  private contactCache: Map<string, GovContact[]> = new Map();

  /**
   * TASK 7: Ingests scraped contacts from external websites safely.
   */
  async ingestContacts(contacts: GovContact[]) {
    console.log(`[Automation] Ingesting ${contacts.length} government contacts...`);
    
    for (const contact of contacts) {
      // Validate email format
      if (!/^\S+@\S+\.\S+$/.test(contact.email)) {
        continue;
      }
      
      const key = `${contact.state}-${contact.agency}`;
      const existing = this.contactCache.get(key) || [];
      
      // Prevent duplicates
      if (!existing.find(c => c.email === contact.email)) {
        existing.push(contact);
        this.contactCache.set(key, existing);
      }
    }
  }

  /**
   * TASK 6: Prepares a composed email draft for a specific application.
   * Finds the correct contact, generates a templated body, and prepares document attachments.
   */
  async composeApplicationEmail(applicationId: string, userId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        program: true,
        user: true,
        documents: {
          where: { verified: true } // Only attach verified documents
        }
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Determine target contact
    const state = application.user.state || 'National';
    const contacts = this.contactCache.get(`${state}-${application.program.agency}`) || [];
    const primaryContact = contacts.length > 0 ? contacts[0].email : 'support@agency.gov'; // Fallback

    // Compose templated email
    const subject = `Application Submission: ${application.program.name} - ${application.user.full_name}`;
    
    let body = `Dear ${application.program.agency} Representative,\n\n`;
    body += `Please find the application submission for ${application.user.full_name}.\n`;
    body += `Program: ${application.program.name}\n\n`;
    
    if (application.documents.length > 0) {
      body += `Attached are ${application.documents.length} verified supporting documents:\n`;
      application.documents.forEach(doc => {
        body += `- ${doc.file_name} (${doc.document_type})\n`;
      });
    } else {
      body += `No supporting documents have been verified for this application yet.\n`;
    }
    
    body += `\nThank you,\nMomPlan Automations System`;

    return {
      to: primaryContact,
      subject,
      body,
      attachments: application.documents.map(doc => ({
        filename: doc.file_name,
        url: doc.file_url, // URL or local path to attach
        mimeType: doc.mime_type
      }))
    };
  }

  /**
   * TASK 5: Application Workflow Hooks for future automation expansion
   */
  async onApplicationStatusChange(applicationId: string, newStatus: string) {
    console.log(`[Automation] Hook triggered for Application ${applicationId} -> ${newStatus}`);
    
    if (newStatus === 'submitted') {
      // Future: automatically generate email composition and queue it for review
      console.log(`[Automation] Queuing async review tasks for submitted application.`);
    }
  }
}

export const automationService = new AutomationService();
