import { getSupabase } from '../lib/supabase';
import { Advisor, Lead, Activity } from '../../types';

export const supabaseService = {
  async getTeam(): Promise<Advisor[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data: advisors, error: advisorError } = await supabase
      .from('advisors' as any)
      .select('*');

    if (advisorError) throw advisorError;

    const team: Advisor[] = await Promise.all(
      (advisors as any[]).map(async (adv) => {
        const { data: leads, error: leadError } = await supabase
          .from('leads' as any)
          .select('*')
          .eq('advisor_id', adv.id);

        if (leadError) throw leadError;

        const { data: activities, error: activityError } = await supabase
          .from('activities' as any)
          .select('*')
          .eq('advisor_id', adv.id);

        if (activityError) throw activityError;

        return {
          id: adv.id,
          name: adv.name,
          photoUrl: adv.photo_url,
          role: adv.role,
          leads: (leads as any[]).map(l => ({
            ...l,
            photoUrl: l.photo_url,
            createdAt: l.created_at,
            lastActivity: l.last_activity,
            products: l.products,
            closedData: l.closed_data,
            scheduledFor: l.scheduled_for,
            isQualifiedOpening: l.is_qualified_opening
          })),
          activities: (activities as any[]).map(a => ({
            ...a,
            leadId: a.lead_id
          }))
        };
      })
    );

    return team;
  },

  async saveAdvisor(advisor: Advisor) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('advisors' as any)
      .upsert({
        id: advisor.id,
        name: advisor.name,
        photo_url: advisor.photoUrl,
        role: advisor.role
      } as any);
    if (error) throw error;
  },

  async saveLead(advisorId: string, lead: Lead) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('leads' as any)
      .upsert({
        id: lead.id,
        advisor_id: advisorId,
        created_at: lead.createdAt,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        value: lead.value,
        status: lead.status,
        source: lead.source,
        last_activity: lead.lastActivity,
        products: lead.products,
        closed_data: lead.closedData,
        notes: lead.notes,
        scheduled_for: lead.scheduledFor,
        is_qualified_opening: lead.isQualifiedOpening
      } as any);
    if (error) throw error;
  },

  async deleteLead(leadId: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('leads' as any)
      .delete()
      .eq('id', leadId);
    if (error) throw error;
  },

  async saveActivity(advisorId: string, activity: Activity) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('activities' as any)
      .upsert({
        id: activity.id,
        advisor_id: advisorId,
        type: activity.type,
        timestamp: activity.timestamp,
        lead_id: activity.leadId
      } as any);
    if (error) throw error;
  },

  async deleteActivity(activityId: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('activities' as any)
      .delete()
      .eq('id', activityId);
    if (error) throw error;
  }
};

