import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting export...');
    
    // Get all messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content, created_at, user_id')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
    }

    // Convert to CSV
    const headers = ['id', 'content', 'created_at', 'user_id'];
    const csv = [
      headers.join(','), // Header row
      ...messages.map(msg => [
        msg.id,
        `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes in content
        msg.created_at,
        msg.user_id
      ].join(','))
    ].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=messages.csv');
    
    return res.status(200).send(csv);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: String(error) });
  }
} 