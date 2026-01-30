import { supabase } from '@/integrations/supabase/client';
import { Ticket } from '@/models/Ticket';
import { JiraService } from '@/services/JiraService';

// Enhanced Ticket interface with rich data from individual ticket endpoint
export interface RichTicket extends Ticket {
  // Additional fields from expanded ticket details
  renderedFields?: {
    description?: string;
    [key: string]: any;
  };
  names?: { [key: string]: string };
  schema?: { [key: string]: any };
  operations?: any[];
  // Original fields from search API
  fields?: {
    summary?: string;
    description?: any;
    status?: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string };
    issuetype?: { name: string };
    labels?: string[];
    [key: string]: any;
  };
}

export class TicketContextService {
  static async loadContextTickets(sessionId: string): Promise<RichTicket[]> {
    if (!sessionId) {
      console.log('⚠️ loadContextTickets called without sessionId');
      return [];
    }

    console.log('🔍 Loading context tickets for session:', sessionId);
    try {
      const { data, error } = await supabase
        .from('session_contexts')
        .select('ticket_data')
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ Error loading context tickets:', error);
        return [];
      }

      if (data) {
        const tickets = data
          .map((row) => row.ticket_data as unknown as RichTicket)
          .filter(Boolean);
        console.log(
          '✅ Loaded context tickets:',
          tickets.map((t) => t.id),
        );
        return tickets;
      } else {
        console.log('📭 No context tickets found for session');
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading context tickets:', error);
      return [];
    }
  }

  static async fetchRichTicketDetails(
    ticketId: string,
    workspaceId: string,
  ): Promise<RichTicket | null> {
    try {
      console.log('🔍 Fetching rich ticket details for:', ticketId);

      const data = await JiraService.getJiraTicketDetails({
        workspace_id: workspaceId,
        ticket_id: ticketId,
      });

      if (!data) {
        console.error('❌ No data returned from rich ticket details API');
        return null;
      }

      // Transform the rich ticket data to our format
      const richTicket: RichTicket = {
        id: data.key || data.id,
        title: data.fields?.summary || 'No title',
        status: data.fields?.status?.name || 'Unknown',
        priority: data.fields?.priority?.name || 'Medium',
        assignee: data.fields?.assignee?.displayName || 'Unassigned',
        storyPoints: data.fields?.customfield_10016 || 0,
        description:
          data.renderedFields?.description ||
          this.convertDescription(data.fields?.description),
        acceptanceCriteria: [], // Will be extracted from description or custom fields
        estimatedHours: 0, // Will be extracted from custom fields
        labels: data.fields?.labels || [],
        project: data.fields?.project?.key || 'Unknown',
        issueType: data.fields?.issuetype?.name || 'Unknown',
        // Rich data fields
        renderedFields: data.renderedFields,
        names: data.names,
        schema: data.schema,
        operations: data.operations,
        fields: data.fields,
      };

      console.log('✅ Rich ticket details fetched successfully for:', ticketId);
      return richTicket;
    } catch (error) {
      console.error('❌ Unexpected error fetching rich ticket details:', error);
      return null;
    }
  }

  static async addTicketToSession(
    ticket: Partial<Ticket> & Pick<Ticket, 'id'>,
    sessionId: string,
    workspaceId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Fetching rich ticket details before storing...');

      // Fetch rich ticket details first
      const richTicket = await this.fetchRichTicketDetails(
        ticket.id,
        workspaceId,
      );

      if (!richTicket) {
        console.warn(
          '⚠️ Could not fetch rich ticket details, storing basic ticket data',
        );
        // Fallback to original ticket data if rich details fetch fails
        // Ensure ticket has all required fields
        const fallbackTicket = {
          ...ticket,
          issueType: ticket.issueType || 'Unknown',
        };
        const { error } = await supabase.from('session_contexts').insert({
          session_id: sessionId,
          ticket_id: ticket.id,
          ticket_data: fallbackTicket as any,
        });

        if (error) {
          console.error('❌ Database error:', error);
          return { success: false, error: 'Failed to add ticket to database' };
        }
      } else {
        // Store rich ticket data
        console.log('💾 Persisting rich ticket data to database...');
        const { error } = await supabase.from('session_contexts').insert({
          session_id: sessionId,
          ticket_id: richTicket.id,
          ticket_data: richTicket as any,
        });

        if (error) {
          console.error('❌ Database error:', error);
          return { success: false, error: 'Failed to add ticket to database' };
        }
      }

      console.log('✅ Successfully persisted to database');
      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  static async removeTicketFromSession(
    ticketId: string,
    sessionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('session_contexts')
        .delete()
        .eq('session_id', sessionId)
        .eq('ticket_id', ticketId);

      if (error) {
        console.error('Error removing ticket from context:', error);
        return {
          success: false,
          error: 'Failed to remove ticket from database',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing ticket from context:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  static async persistPendingTickets(
    sessionId: string,
    tickets: Ticket[],
    workspaceId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!sessionId || tickets.length === 0) return { success: true };

    try {
      // Check which tickets are already in the database for this session
      const { data: existingContexts } = await supabase
        .from('session_contexts')
        .select('ticket_id')
        .eq('session_id', sessionId);

      const existingTicketIds = new Set(
        existingContexts?.map((ctx) => ctx.ticket_id) || [],
      );

      // Only insert tickets that don't already exist in the database
      const ticketsToInsert = tickets.filter(
        (ticket) => !existingTicketIds.has(ticket.id),
      );

      if (ticketsToInsert.length === 0) {
        console.log('All tickets already persisted to session');
        return { success: true };
      }

      // Fetch rich details for all tickets to insert
      const richTickets: RichTicket[] = [];
      for (const ticket of ticketsToInsert) {
        const richTicket = await this.fetchRichTicketDetails(
          ticket.id,
          workspaceId,
        );
        if (richTicket) {
          richTickets.push(richTicket);
        } else {
          // Fallback to original ticket data
          richTickets.push(ticket as RichTicket);
        }
      }

      const contextData = richTickets.map((ticket) => ({
        session_id: sessionId,
        ticket_id: ticket.id,
        ticket_data: ticket as any,
      }));

      const { error } = await supabase
        .from('session_contexts')
        .insert(contextData);

      if (error) {
        console.error('Error persisting context tickets:', error);
        return { success: false, error: 'Failed to persist tickets' };
      } else {
        console.log(
          `Persisted ${richTickets.length} new tickets to session ${sessionId}`,
        );
        return { success: true };
      }
    } catch (error) {
      console.error('Error persisting context tickets:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  // Helper method to convert Jira description format
  private static convertDescription(description: any): string {
    if (!description || !description.content) return '';
    return description.content
      .flatMap(
        (block: any) =>
          block.content?.map((c: any) => c.text).filter(Boolean) || [],
      )
      .join('\n');
  }
}
