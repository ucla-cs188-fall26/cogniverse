import {afterEach,describe,expect,it,vi} from 'vitest';
import {createWorkspace,loadWorkspace,parseWorkspace,saveWorkspace,WORKSPACE_STORAGE_KEY} from './workspace';
import {createChatSession} from './sessions';
import {mergeGraph} from './graphMerge';
import {getMockResult} from '../services/mockLLM';
import {updateConcept} from './nodeEdit';

const populated=()=>{
 const workspace=createWorkspace();
 const a=workspace.sessions[0],b=createChatSession();
 const burger=getMockResult('How to make a burger');
 a.title='Cooking';a.draft='Next question';a.messages=[
  {id:'q1',role:'user',content:'How to make a burger',createdAt:1},
  {id:'a1',role:'assistant',content:burger.chatResponse,createdAt:2,nodeIds:['make-a-burger']},
 ];
 const graph=mergeGraph([],[],burger,'a1','q1','How to make a burger',a.id);
 graph.nodes[0].position={x:700,y:900};graph.nodes[0].selected=true;
 workspace.sessions.push(b);workspace.activeSessionId=b.id;workspace.mode='openai';
 workspace.nodes=updateConcept(graph.nodes,'make-a-burger',{label:'My recipe',summary:'My notes',quote:'Context',details:'Use my favorite bun.'});
 workspace.edges=graph.edges;
 return workspace;
};
afterEach(()=>vi.unstubAllGlobals());

describe('local workspace persistence',()=>{
 it('restores chats, drafts, mode, graph details, positions, and answer provenance',()=>{
  const original=populated();const restored=parseWorkspace(JSON.stringify(original))!;
  expect(restored.sessions).toEqual(original.sessions);expect(restored.activeSessionId).toBe(original.activeSessionId);
  expect(restored.mode).toBe('openai');expect(restored.nodes[0].data.details).toBe('Use my favorite bun.');
  expect(restored.nodes[0].position).toEqual({x:700,y:900});
  expect(restored.nodes[0].data.answers).toEqual(original.nodes[0].data.answers);
  expect(restored.nodes[0].data.isNew).toBe(false);expect(restored.nodes[0].selected).toBeUndefined();
 });
 it('restores an undirected cross-chat connection with its label and no arrow',()=>{
  const workspace=populated();
  const result=getMockResult('How do I make spaghetti?',workspace.nodes.map(node=>({id:node.id,label:node.data.label})));
  const graph=mergeGraph(workspace.nodes,workspace.edges,result,'a2','q2','How do I make spaghetti?',workspace.sessions[1].id);
  const restored=parseWorkspace(JSON.stringify({...workspace,...graph}))!;
  expect(restored.edges[0].label).toBe('cooking');expect(restored.edges[0].markerEnd).toBeUndefined();
 });
 it.each(['not json','null','{}',JSON.stringify({version:2})])('ignores malformed or unsupported saved state: %s',raw=>{
  expect(parseWorkspace(raw)).toBeNull();
 });
 it('rejects corrupt sessions, duplicate message IDs, malformed node data, and dangling graph edges',()=>{
  const base=populated();
  const cases=[
   {...base,sessions:[{...base.sessions[0],messages:null}]},
   {...base,sessions:[base.sessions[0],base.sessions[0]]},
   {...base,sessions:base.sessions.map(session=>({...session,messages:[...base.sessions[0].messages]}))},
   {...base,nodes:[{...base.nodes[0],data:{...base.nodes[0].data,answers:[null]}}]},
   {...base,edges:[{id:'bad',source:'missing',target:'make-a-burger',data:{relationship:'cooking'}}]},
  ];
  cases.forEach(value=>expect(parseWorkspace(JSON.stringify(value))).toBeNull());
 });
 it('falls back to an existing chat if the stored active ID is missing',()=>{
  const workspace=populated();workspace.activeSessionId='deleted';
  expect(parseWorkspace(JSON.stringify(workspace))?.activeSessionId).toBe(workspace.sessions[0].id);
 });
 it('restores an interrupted request as a retryable error in its owning chat',()=>{
  const workspace=populated();const a=workspace.sessions[0];a.messages=a.messages.slice(0,1);
  workspace.pendingSessionId=a.id;
  const restored=parseWorkspace(JSON.stringify(workspace))!;
  expect(restored.sessions[0].messages.at(-1)).toMatchObject({role:'error',content:expect.stringContaining('interrupted')});
  expect(restored.sessions[1].messages).toEqual([]);expect(restored.pendingSessionId).toBeUndefined();
 });
 it('handles unavailable storage without crashing and does not persist API configuration',()=>{
  const setItem=vi.fn((_key:string,_value:string)=>{throw new Error('Quota exceeded');});
  vi.stubGlobal('window',{localStorage:{getItem:()=>{throw new Error('Storage denied');},setItem}});
  expect(loadWorkspace().workspace.sessions).toHaveLength(1);expect(loadWorkspace().error).toContain('unavailable');
  expect(saveWorkspace(populated())).toBe(false);
  expect(setItem.mock.calls[0][0]).toBe(WORKSPACE_STORAGE_KEY);
  expect(setItem.mock.calls[0][1]).not.toContain('VITE_OPENAI_API_KEY');
 });
 it('loads a valid saved workspace and creates one empty chat on first use',()=>{
  const workspace=populated();let raw:string|null=JSON.stringify(workspace);
  vi.stubGlobal('window',{localStorage:{getItem:()=>raw,setItem:vi.fn()}});
  expect(loadWorkspace().workspace.sessions).toHaveLength(2);
  raw=null;expect(loadWorkspace().workspace.sessions[0].messages).toEqual([]);
 });
});
