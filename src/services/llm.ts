import OpenAI from 'openai';
import type {ExistingTopic,LLMResult} from '../types';
import {extractionPrompt,graphResponseFormat,LLMParseError,parseAndSanitize} from './extraction';
export {LLMParseError,parseAndSanitize} from './extraction';
export const missingKeyMessage='No API key found. Add VITE_OPENAI_API_KEY to .env.local and restart the dev server.';
export const hasApiKey=Boolean(import.meta.env.VITE_OPENAI_API_KEY?.trim());
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'?value as Record<string,unknown>:{};
export const openaiModel = import.meta.env.VITE_OPENAI_MODEL?.trim() || 'gpt-4o-mini';

export async function askLLM(
 history: {role:'user'|'assistant';content:string}[],
 existingNodes: (ExistingTopic&{label:string})[],
 signal?: AbortSignal,
): Promise<LLMResult> {
 if (!hasApiKey) throw new Error(missingKeyMessage);
 const client = new OpenAI({
  apiKey:import.meta.env.VITE_OPENAI_API_KEY.trim(),
  dangerouslyAllowBrowser:true, // Local prototype only; never publish with a real key.
  maxRetries:0,
 });
 const controller = new AbortController();
 const abort = () => controller.abort();
 signal?.addEventListener('abort',abort,{once:true});
 if(signal?.aborted)controller.abort();
 const timer = setTimeout(abort,45000);
 try {
  const response = await client.chat.completions.create({
   model:openaiModel,
   temperature:0.3,
   max_completion_tokens:3500,
   response_format:graphResponseFormat,
   messages:[
    {role:'system',content:extractionPrompt+'\nEXISTING_NODES: '+JSON.stringify(existingNodes)},
    ...history.slice(-20),
   ],
  },{signal:controller.signal});
  const choice=response.choices?.[0];
  if(!choice || choice.finish_reason!=='stop' || choice.message?.refusal)throw new LLMParseError();
  const userPrompt=[...history].reverse().find(message=>message.role==='user')?.content??'';
  return parseAndSanitize(choice.message?.content??'',existingNodes,userPrompt,true);
 } catch(error) {
  if(error instanceof LLMParseError)throw error;
  if(error instanceof SyntaxError)throw new LLMParseError();
  const status=record(error).status;
  if(status===401||status===403)throw new Error('The OpenAI API key was rejected or lacks access. Check VITE_OPENAI_API_KEY.');
  if(status===429)throw new Error('Rate limit or quota reached. Wait a moment and retry.');
  if(status===404)throw new Error('The OpenAI model is unavailable. Check VITE_OPENAI_MODEL in .env.local.');
  if(status===400)throw new Error('OpenAI rejected the request. Check your OpenAI API key and model settings.');
  throw new Error("Couldn't reach the model. Check your connection and retry.");
 } finally {
  clearTimeout(timer);
  signal?.removeEventListener('abort',abort);
 }
}
