import type { Node } from '@xyflow/react';
export type Relationship = string;
export interface Evidence { source:'user'|'assistant'; quote:string }
export interface GraphEvidence extends Evidence { messageId?:string; sessionId?:string }
export interface ExistingTopic { id:string; label?:string; question?:string; focus?:string }
export interface LLMNode { id:string; label:string; summary:string; quote:string; evidence?:Evidence; focus?:string }
export interface LLMEdge { source:string; target:string; relationship:Relationship; evidence?:Evidence; kind?:'shared_topic' }
export interface TopicAnswer { messageId:string; questionMessageId?:string; sessionId?:string; question:string; answer:string }
export interface LLMResult { chatResponse:string; nodes:LLMNode[]; edges:LLMEdge[]; primaryTopicId?:string }
export interface ConceptNodeData extends Record<string,unknown> {label:string; summary:string; quote:string; firstSeenMessageId:string; evidence?:GraphEvidence; answers?:TopicAnswer[]; details?:string; focus?:string; isNew?:boolean}
export type Concept = Node<ConceptNodeData>;
export interface ChatMessage {id:string;role:'user'|'assistant'|'error';content:string;createdAt:number;nodeIds?:string[];source?:'demo'|'openai'}

export interface ChatSession { id:string; title:string; createdAt:number; messages:ChatMessage[]; draft:string; customTitle?:boolean }
export interface WorkspaceSnapshot { version:1; sessions:ChatSession[]; activeSessionId:string; nodes:Concept[]; edges:import('@xyflow/react').Edge[]; pendingSessionId?:string|null; deletedConnections?:string[]; deletedNodeIds?:string[] }
