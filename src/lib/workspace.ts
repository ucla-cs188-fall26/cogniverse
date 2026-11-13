import type {ChatMessage,ChatSession,Concept,WorkspaceSnapshot} from '../types';
import type {Edge} from '@xyflow/react';
import {styledConnection,type ConnectionData} from './connections';
import {createChatSession} from './sessions';

export const WORKSPACE_STORAGE_KEY='cogniverse.workspace.v1';
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const string=(value:unknown):value is string=>typeof value==='string';
const number=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const id=(value:unknown):value is string=>string(value)&&Boolean(value.trim());
const unique=(values:string[])=>new Set(values).size===values.length;

export function createWorkspace():WorkspaceSnapshot {
 const session=createChatSession();
 return {version:1,sessions:[session],activeSessionId:session.id,nodes:[],edges:[],mode:'demo',deletedConnections:[],deletedNodeIds:[]};
}

function validMessage(value:unknown):value is ChatMessage {
 return object(value)&&id(value.id)&&['user','assistant','error'].includes(String(value.role))&&string(value.content)&&number(value.createdAt)
  &&(value.nodeIds===undefined||(Array.isArray(value.nodeIds)&&value.nodeIds.every(id)))
  &&(value.source===undefined||value.source==='demo'||value.source==='openai');
}
function validSession(value:unknown):value is ChatSession {
 return object(value)&&id(value.id)&&id(value.title)&&number(value.createdAt)&&string(value.draft)
  &&(value.customTitle===undefined||typeof value.customTitle==='boolean')&&Array.isArray(value.messages)&&value.messages.every(validMessage);
}
function validEvidence(value:unknown):boolean {
 return value===undefined||(object(value)&&(value.source==='user'||value.source==='assistant')&&string(value.quote)
  &&(value.messageId===undefined||id(value.messageId))&&(value.sessionId===undefined||id(value.sessionId)));
}
function validNode(value:unknown):value is Concept {
 if(!object(value)||!id(value.id)||!object(value.position)||!number(value.position.x)||!number(value.position.y)||!object(value.data))return false;
 const data=value.data;
 return id(data.label)&&string(data.summary)&&string(data.quote)&&id(data.firstSeenMessageId)&&validEvidence(data.evidence)
  &&(data.details===undefined||string(data.details))&&(data.focus===undefined||string(data.focus))
  &&(data.answers===undefined||(Array.isArray(data.answers)&&data.answers.every(answer=>object(answer)&&id(answer.messageId)
   &&string(answer.question)&&string(answer.answer)&&(answer.questionMessageId===undefined||id(answer.questionMessageId))
   &&(answer.sessionId===undefined||id(answer.sessionId)))));
}
function validEdge(value:unknown):value is Edge {
 return object(value)&&id(value.id)&&id(value.source)&&id(value.target)&&object(value.data)&&id(value.data.relationship)
  &&(value.data.kind===undefined||value.data.kind==='shared_topic')&&validEvidence(value.data.evidence)
  &&(value.data.userCreated===undefined||typeof value.data.userCreated==='boolean')
  &&(value.data.manuallyEdited===undefined||typeof value.data.manuallyEdited==='boolean')
  &&(value.data.originalRelationship===undefined||id(value.data.originalRelationship));
}

export function parseWorkspace(raw:string):WorkspaceSnapshot|null {
 try{
  const saved:unknown=JSON.parse(raw);
  if(!object(saved)||saved.version!==1||!Array.isArray(saved.sessions)||!saved.sessions.length||!saved.sessions.every(validSession)
   ||!Array.isArray(saved.nodes)||!saved.nodes.every(validNode)||!Array.isArray(saved.edges)||!saved.edges.every(validEdge)
   ||(saved.mode!=='demo'&&saved.mode!=='openai'))return null;
  const sessions=saved.sessions;
  if(saved.deletedConnections!==undefined&&(!Array.isArray(saved.deletedConnections)||!saved.deletedConnections.every(id)))return null;
  if(saved.deletedNodeIds!==undefined&&(!Array.isArray(saved.deletedNodeIds)||!saved.deletedNodeIds.every(id)))return null;
  if(saved.pendingSessionId!==undefined&&saved.pendingSessionId!==null&&!id(saved.pendingSessionId))return null;
  if(!unique(sessions.map(session=>session.id))||!unique(sessions.flatMap(session=>session.messages.map(message=>message.id)))
   ||!unique(saved.nodes.map(node=>node.id))||!unique(saved.edges.map(edge=>edge.id)))return null;
  const nodeIds=new Set(saved.nodes.map(node=>node.id));
  if(saved.edges.some(edge=>!nodeIds.has(edge.source)||!nodeIds.has(edge.target)))return null;
  // Restore only app-owned node fields; transient selection and highlights are reset.
  const nodes:Concept[]=saved.nodes.map(node=>({id:node.id,type:'concept',position:node.position,data:{
   label:node.data.label,summary:node.data.summary,quote:node.data.quote,firstSeenMessageId:node.data.firstSeenMessageId,
   ...(node.data.evidence?{evidence:node.data.evidence}:{}),...(node.data.answers?{answers:node.data.answers}:{}),
   ...(node.data.details!==undefined?{details:node.data.details}:{}),...(node.data.focus?{focus:node.data.focus}:{}),isNew:false,
  }}));
  // Edge appearance comes from app logic, never arbitrary persisted style objects.
  const edges:Edge[]=saved.edges.map(edge=>styledConnection(edge.id,edge.source,edge.target,{
   relationship:String(edge.data!.relationship),
   ...(edge.data!.kind==='shared_topic'?{kind:'shared_topic' as const}:{}),
   ...(edge.data!.evidence?{evidence:edge.data!.evidence as ConnectionData['evidence']}:{}),
   ...(edge.data!.userCreated?{userCreated:true}:{}),...(edge.data!.manuallyEdited?{manuallyEdited:true}:{}),
   ...(edge.data!.originalRelationship?{originalRelationship:String(edge.data!.originalRelationship)}:{}),
  }));
  const recoveredSessions=sessions.map(session=>{
   if(session.id!==saved.pendingSessionId||session.messages.at(-1)?.role!=='user')return session;
   return {...session,messages:[...session.messages,{
    id:crypto.randomUUID(),role:'error' as const,content:'This reply was interrupted when the page closed. Retry to continue.',createdAt:Date.now(),
   }]};
  });
  return {version:1,sessions:recoveredSessions,activeSessionId:sessions.some(session=>session.id===saved.activeSessionId)?String(saved.activeSessionId):sessions[0].id,nodes,edges,mode:saved.mode,deletedConnections:(saved.deletedConnections as string[]|undefined)??[],deletedNodeIds:(saved.deletedNodeIds as string[]|undefined)??[]};
 }catch{return null;}
}

export function loadWorkspace():{workspace:WorkspaceSnapshot;error?:string} {
 try{
  const raw=window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if(!raw)return {workspace:createWorkspace()};
  const workspace=parseWorkspace(raw);
  if(workspace)return {workspace};
  return {workspace:createWorkspace(),error:'Saved workspace could not be restored. This workspace will replace it when saved.'};
 }catch{return {workspace:createWorkspace(),error:'Browser storage is unavailable. Keep this tab open to retain your work.'};}
}
export function saveWorkspace(workspace:WorkspaceSnapshot):boolean {
 try{window.localStorage.setItem(WORKSPACE_STORAGE_KEY,JSON.stringify(workspace));return true;}
 catch{return false;}
}
