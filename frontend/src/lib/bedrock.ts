import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BedrockResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

const BEDROCK_API_KEY = process.env.NEXT_PUBLIC_AWS_BEDROCK_API_KEY;
const BEDROCK_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
const BEDROCK_MODEL = process.env.NEXT_PUBLIC_BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

/**
 * Send a message to AWS Bedrock and get a response
 */
export async function bedrockChat(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  if (!BEDROCK_API_KEY) {
    throw new Error('NEXT_PUBLIC_AWS_BEDROCK_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/${BEDROCK_MODEL}/invoke`,
      {
        anthropic_version: 'bedrock-2023-06-01',
        max_tokens: 2048,
        system: systemPrompt || 'You are a helpful assistant.',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      },
      {
        headers: {
          'x-amz-bedrock-accept': 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BEDROCK_API_KEY}`,
        },
      }
    );

    const bedrockResponse: BedrockResponse = response.data;
    const textContent = bedrockResponse.content.find(c => c.type === 'text');
    return textContent?.text || 'No response from model';
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Bedrock API error: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Stream responses from Bedrock (for real-time chat)
 */
export async function* bedrockChatStream(
  messages: Message[],
  systemPrompt?: string
): AsyncGenerator<string, void, unknown> {
  if (!BEDROCK_API_KEY) {
    throw new Error('NEXT_PUBLIC_AWS_BEDROCK_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/${BEDROCK_MODEL}/invoke-with-response-stream`,
      {
        anthropic_version: 'bedrock-2023-06-01',
        max_tokens: 2048,
        system: systemPrompt || 'You are a helpful assistant.',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      },
      {
        headers: {
          'x-amz-bedrock-accept': 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BEDROCK_API_KEY}`,
        },
        responseType: 'stream',
      }
    );

    for await (const chunk of response.data) {
      const text = chunk.toString();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Bedrock streaming error: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}
