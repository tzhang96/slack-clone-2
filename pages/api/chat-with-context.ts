import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 1. Create embedding for the query
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
      encoding_format: "float",
    });

    // 2. Search Pinecone for similar messages
    const index = pinecone.Index("messages-from-db");
    const searchResponse = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });

    // 3. Format context from search results
    const context = searchResponse.matches
      .map(match => match.metadata?.content)
      .filter(Boolean)
      .join('\n\n');

    // 4. Send query and context to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant answering questions about chat messages. 
          Below is some context from previous messages that may be relevant to the question.
          Use this context to inform your answer, but don't mention that you're using any context 
          unless specifically asked. Respond in a natural, conversational way.
          
          Context:
          ${context}`
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // 5. Return both the AI response and the context used
    return res.status(200).json({
      answer: completion.choices[0].message.content,
      context: searchResponse.matches.map(match => ({
        content: match.metadata?.content,
        score: match.score,
      })),
    });

  } catch (error: any) {
    console.error('Error in chat-with-context:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 