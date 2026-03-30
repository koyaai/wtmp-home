import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// This function is called by the monthly automation.
// It loops through all active ReportSchedule records and sends reports
// for those whose day_of_month matches today.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const dayOfMonth = today.getDate();
    const todayStr = today.toISOString().split('T')[0];

    const allSchedules = await base44.asServiceRole.entities.ReportSchedule.filter({ active: true });

    const due = allSchedules.filter(s => {
      const scheduledDay = s.day_of_month || 1;
      // Check if today is the scheduled day
      if (dayOfMonth !== scheduledDay) return false;
      // Don't double-send on same day
      if (s.last_sent_date === todayStr) return false;
      return true;
    });

    const results = [];

    for (const schedule of due) {
      try {
        const res = await base44.asServiceRole.functions.invoke('sendSEOReport', {
          client_id: schedule.client_id,
          recipient_emails: schedule.recipient_emails,
          notes: schedule.notes || '',
        });
        results.push({ client: schedule.client_name, status: 'sent', detail: res });
      } catch (err) {
        results.push({ client: schedule.client_name, status: 'error', error: err.message });
      }
    }

    return Response.json({
      success: true,
      day: dayOfMonth,
      checked: allSchedules.length,
      sent: results.filter(r => r.status === 'sent').length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});