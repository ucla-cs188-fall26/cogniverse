import {describe,expect,it} from 'vitest';
import type {ChatMessage} from '../types';
import {conversationHistory,createChatSession,findMessageSession,renameSession,setSessionMessages,updateSession} from './sessions';
import {getFixtureResult} from '../test/fixtures/conversations';
import {mergeGraph} from './graphMerge';

const message=(id:string,content:string,role:ChatMessage['role']='user'):ChatMessage=>({id,content,role,createdAt:1});

describe('independent chats with one graph',()=>{
 it('keeps histories and unsent drafts separate when a response completes in another chat',()=>{
  const a=createChatSession(),b=createChatSession();
  let sessions=updateSession([a,b],b.id,session=>({...session,draft:'My unsent question'}));
  sessions=setSessionMessages(sessions,a.id,[message('a1','How to make a burger')]);
  // Switching to B changes only the active ID in App, not where A's eventual reply goes.
  sessions=setSessionMessages(sessions,a.id,[message('a1','How to make a burger'),message('a2','A full burger recipe','assistant')]);
  expect(sessions[0].title).toBe('How to make a burger');
  expect(conversationHistory(sessions[0])).toHaveLength(2);
  expect(conversationHistory(sessions[1])).toEqual([]);expect(sessions[1].draft).toBe('My unsent question');
  expect(findMessageSession(sessions,'a2')?.id).toBe(a.id);
 });
 it('preserves a custom title when later messages arrive and rejects blank renames',()=>{
  const a=createChatSession();
  const renamed=renameSession([a],a.id,'  Cooking ideas  ');
  const next=setSessionMessages(renamed,a.id,[message('a1','How do I make spaghetti?')]);
  expect(next[0].title).toBe('Cooking ideas');expect(next[0].customTitle).toBe(true);
  expect(renameSession(next,a.id,'  ')).toBe(next);
 });
 it('sends only the selected chat history and excludes error bubbles',()=>{
  const a={...createChatSession(),messages:[message('a1','Burger'),message('a-error','Network error','error')]};
  const b={...createChatSession(),messages:[message('b1','Spaghetti')]};
  expect(conversationHistory(a)).toEqual([{role:'user',content:'Burger'}]);
  expect(conversationHistory(b)).toEqual([{role:'user',content:'Spaghetti'}]);
 });
 it('connects burger and spaghetti from different chats and preserves their source sessions',()=>{
  const a=createChatSession(),b=createChatSession();
  const burger=getFixtureResult('How to make a burger');
  const first=mergeGraph([],[],burger,'a-answer','a-question','How to make a burger',a.id);
  const spaghetti=getFixtureResult('How do I make spaghetti?',first.nodes.map(node=>({id:node.id,label:node.data.label})));
  const second=mergeGraph(first.nodes,first.edges,spaghetti,'b-answer','b-question','How do I make spaghetti?',b.id);
  expect(second.nodes).toHaveLength(2);expect(second.edges[0].label).toBe('cooking');
  expect(second.nodes[0].data.answers?.[0].sessionId).toBe(a.id);
  expect(second.nodes[1].data.answers?.[0].sessionId).toBe(b.id);
  expect(second.nodes[0].data.evidence?.sessionId).toBe(a.id);
  const sessions=[{...a,messages:[message('a-question','How to make a burger'),message('a-answer',burger.chatResponse,'assistant')]},{...b,messages:[message('b-question','How do I make spaghetti?'),message('b-answer',spaghetti.chatResponse,'assistant')]}];
  expect(findMessageSession(sessions,second.nodes[0].data.answers![0].messageId)?.id).toBe(a.id);
  expect(findMessageSession(sessions,second.nodes[1].data.evidence!.messageId!)?.id).toBe(b.id);
 });
 it('appends answers from separate chats to the same topic without losing its original source',()=>{
  const first=mergeGraph([],[],getFixtureResult('How to make a burger'),'a1','q1','How to make a burger','chat-a');
  const second=mergeGraph(first.nodes,first.edges,getFixtureResult('How to make a burger'),'a2','q2','How to make a burger','chat-b');
  expect(second.nodes).toHaveLength(1);
  expect(second.nodes[0].data.answers?.map(answer=>answer.sessionId)).toEqual(['chat-a','chat-b']);
  expect(second.nodes[0].data.evidence?.sessionId).toBe('chat-a');
 });
});
