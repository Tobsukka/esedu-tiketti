/**
 * LLM Service
 * 
 * This service provides access to OpenAI's language models through LangChain.
 * It configures chat models for different use cases (standard and advanced).
 */

import { ChatOpenAI } from '@langchain/openai';
import { AI_CONFIG } from '../config.js';

// Standard chat model using 'completionModel' (e.g., gpt-3.5-turbo)
export const chatModel = new ChatOpenAI({
  openAIApiKey: AI_CONFIG.llm.openai.apiKey,
  modelName: AI_CONFIG.llm.openai.completionModel,
  temperature: 0.7,
  maxTokens: 1000,
  verbose: AI_CONFIG.agent.verbose,
  timeout: 60000, // 60 seconds
});

// Advanced chat model using 'advancedModel' (e.g., gpt-4)
export const advancedChatModel = new ChatOpenAI({
  openAIApiKey: AI_CONFIG.llm.openai.apiKey,
  modelName: AI_CONFIG.llm.openai.advancedModel,
  temperature: 0.5,
  maxTokens: 2000,
  verbose: AI_CONFIG.agent.verbose,
  timeout: 120000, // 120 seconds
});

/**
 * Generate a response using the standard chat model
 * @param input - The input prompt for the model
 * @returns A promise resolving to the generated text response
 */
export async function generateResponse(input: string): Promise<string> {
  try {
    const response = await chatModel.invoke(input);
    return response.content.toString();
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Generate a response using the advanced chat model
 * @param input - The input prompt for the model
 * @returns A promise resolving to the generated text response
 */
export async function generateAdvancedResponse(input: string): Promise<string> {
  try {
    const response = await advancedChatModel.invoke(input);
    return response.content.toString();
  } catch (error) {
    console.error('Error generating advanced response:', error);
    throw new Error('Failed to generate advanced response');
  }
}

/**
 * Generate a structured response from LLM
 * @param input - Input text to generate a response for
 * @param instructions - Instructions for the LLM
 * @param modelType - Whether to use 'standard' or 'advanced' model
 * @returns A promise resolving to the generated response
 */
export async function generateStructuredResponse<T>(
  input: string,
  instructions: string,
  modelType: 'standard' | 'advanced' = 'standard'
): Promise<T> {
  try {
    const model = modelType === 'advanced' ? advancedChatModel : chatModel;
    const fullPrompt = `${instructions}\n\n${input}\n\nRespond only with valid JSON.`;
    
    // Log the prompt but truncate very long prompts to avoid console spam
    const logPrompt = fullPrompt.length > 500 ? 
      fullPrompt.substring(0, 250) + '...[truncated]...' + fullPrompt.substring(fullPrompt.length - 250) : 
      fullPrompt;
    
    console.log(`--------- LLM PROMPT (${modelType}) ---------`);
    console.log(logPrompt);
    console.log(`-------------------------------------------`);
    
    console.log(`Making LLM call with model: ${modelType}`);
    const startTime = Date.now();
    
    const response = await model.invoke(fullPrompt);
    const responseText = response.content.toString();
    
    const duration = Date.now() - startTime;
    console.log(`LLM call completed in ${duration}ms`);
    
    // Log a truncated version of the response to avoid console spam
    const logResponse = responseText.length > 500 ? 
      responseText.substring(0, 250) + '...[truncated]...' + responseText.substring(responseText.length - 250) : 
      responseText;
    
    console.log(`--------- LLM RESPONSE ---------`);
    console.log(logResponse);
    console.log(`-------------------------------`);
    
    // Extract JSON from response if needed
    let jsonText = responseText;
    
    // If the response contains markdown code blocks, extract them
    if (responseText.includes('```json')) {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1].trim();
      }
    } else if (responseText.includes('```')) {
      // Try to extract from any code block
      const codeMatch = responseText.match(/```\n?([\s\S]*?)\n?```/);
      if (codeMatch && codeMatch[1]) {
        jsonText = codeMatch[1].trim();
      }
    }
    
    try {
      // Parse the JSON with some error handling
      const parsedResult = JSON.parse(jsonText) as T;
      
      // Quick validation - check if the object has some properties
      if (typeof parsedResult !== 'object' || parsedResult === null || Object.keys(parsedResult).length === 0) {
        throw new Error('Parsed JSON is empty or invalid');
      }
      
      return parsedResult;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw response:', responseText);
      console.error('Attempted to parse:', jsonText);
      throw new Error('Model did not return valid JSON');
    }
  } catch (error) {
    console.error('Error generating structured response:', error);
    throw new Error(`Failed to generate structured response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 