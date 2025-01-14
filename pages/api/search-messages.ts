import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize clients
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 1. Create embedding for the search query
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
      encoding_format: "float"
    });

    // 2. Query Pinecone
    const index = pinecone.Index("messages-from-db");
    const queryResponse = await index.query({
      vector: embedding.data[0].embedding,
      topK: topK,
      includeMetadata: true
    });

    // 3. Format results
    const results = queryResponse.matches.map(match => ({
      score: match.score,
      content: match.metadata?.content,
      created_at: match.metadata?.created_at,
      user_id: match.metadata?.user_id
    }));

    return res.status(200).json({ results });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: String(error) });
  }
} 