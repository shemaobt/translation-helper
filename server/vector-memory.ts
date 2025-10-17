import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR,
});

// Collection name for OBT conversations
const COLLECTION_NAME = 'obt_global_memory';

// Vector dimension for OpenAI text-embedding-3-small
const VECTOR_DIM = 1536;

/**
 * Initialize Qdrant collection if it doesn't exist
 */
export async function initializeQdrantCollection() {
  try {
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections.some(
      (col) => col.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      console.log(`Creating Qdrant collection: ${COLLECTION_NAME}`);
      
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_DIM,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      // Create payload indexes for efficient filtering
      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'userId',
        field_schema: 'keyword',
      });

      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'facilitatorId',
        field_schema: 'keyword',
      });

      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'chatId',
        field_schema: 'keyword',
      });

      console.log(`Qdrant collection ${COLLECTION_NAME} created successfully`);
    } else {
      console.log(`Qdrant collection ${COLLECTION_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error initializing Qdrant collection:', error);
    throw error;
  }
}

/**
 * Generate embedding for a text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Store a message in Qdrant with its embedding
 */
export async function storeMessageEmbedding(params: {
  messageId: string;
  chatId: string;
  userId: string;
  facilitatorId?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  competencyTags?: string[];
}) {
  try {
    const embedding = await generateEmbedding(params.content);

    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: params.messageId,
          vector: embedding,
          payload: {
            messageId: params.messageId,
            chatId: params.chatId,
            userId: params.userId,
            facilitatorId: params.facilitatorId || null,
            content: params.content,
            role: params.role,
            timestamp: params.timestamp.toISOString(),
            competencyTags: params.competencyTags || [],
          },
        },
      ],
    });

    console.log(`Stored embedding for message ${params.messageId}`);
  } catch (error) {
    console.error('Error storing message embedding:', error);
    // Don't throw - we don't want embedding failures to break the chat flow
  }
}

/**
 * Search for relevant messages using semantic search
 */
export async function searchRelevantMessages(params: {
  query: string;
  facilitatorId?: string;
  userId?: string;
  limit?: number;
  scoreThreshold?: number;
}): Promise<Array<{
  messageId: string;
  chatId: string;
  content: string;
  role: string;
  timestamp: string;
  score: number;
}>> {
  try {
    const queryEmbedding = await generateEmbedding(params.query);
    const limit = params.limit || 5;
    const scoreThreshold = params.scoreThreshold || 0.7;

    // Build filter for facilitator-specific or user-specific search
    const filter: any = {};
    
    if (params.facilitatorId) {
      filter.must = [
        {
          key: 'facilitatorId',
          match: { value: params.facilitatorId },
        },
      ];
    } else if (params.userId) {
      filter.must = [
        {
          key: 'userId',
          match: { value: params.userId },
        },
      ];
    }

    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      with_payload: true,
      score_threshold: scoreThreshold,
    });

    return searchResults.map((result) => ({
      messageId: result.payload?.messageId as string,
      chatId: result.payload?.chatId as string,
      content: result.payload?.content as string,
      role: result.payload?.role as string,
      timestamp: result.payload?.timestamp as string,
      score: result.score,
    }));
  } catch (error) {
    console.error('Error searching relevant messages:', error);
    return [];
  }
}

/**
 * Search globally across all facilitators (for cross-learning)
 */
export async function searchGlobalMemory(params: {
  query: string;
  limit?: number;
  scoreThreshold?: number;
}): Promise<Array<{
  messageId: string;
  chatId: string;
  content: string;
  role: string;
  timestamp: string;
  score: number;
}>> {
  try {
    const queryEmbedding = await generateEmbedding(params.query);
    const limit = params.limit || 10;
    const scoreThreshold = params.scoreThreshold || 0.75;

    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
      score_threshold: scoreThreshold,
    });

    return searchResults.map((result) => ({
      messageId: result.payload?.messageId as string,
      chatId: result.payload?.chatId as string,
      content: result.payload?.content as string,
      role: result.payload?.role as string,
      timestamp: result.payload?.timestamp as string,
      score: result.score,
    }));
  } catch (error) {
    console.error('Error searching global memory:', error);
    return [];
  }
}

/**
 * Get context summary from relevant messages
 */
export async function getContextForQuery(params: {
  query: string;
  facilitatorId?: string;
  userId?: string;
  includeGlobal?: boolean;
}): Promise<string> {
  try {
    // First, search facilitator/user-specific messages
    const relevantMessages = await searchRelevantMessages({
      query: params.query,
      facilitatorId: params.facilitatorId,
      userId: params.userId,
      limit: 3,
    });

    // Optionally add global context for cross-learning
    let globalMessages: any[] = [];
    if (params.includeGlobal) {
      globalMessages = await searchGlobalMemory({
        query: params.query,
        limit: 2,
        scoreThreshold: 0.8,
      });
    }

    // Format context for the AI
    let context = '';

    if (relevantMessages.length > 0) {
      context += '## Relevant Past Conversations:\n\n';
      relevantMessages.forEach((msg, idx) => {
        context += `${idx + 1}. [${msg.role}]: ${msg.content}\n`;
      });
      context += '\n';
    }

    if (globalMessages.length > 0) {
      context += '## Related Experiences from Other Facilitators:\n\n';
      globalMessages.forEach((msg, idx) => {
        context += `${idx + 1}. ${msg.content}\n`;
      });
      context += '\n';
    }

    return context;
  } catch (error) {
    console.error('Error getting context for query:', error);
    return '';
  }
}
