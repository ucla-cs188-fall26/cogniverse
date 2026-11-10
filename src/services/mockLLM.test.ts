import {afterEach,describe,expect,it,vi} from 'vitest';
import {askMockLLM,demoScenarios,getMockResult} from './mockLLM';
import {parseAndSanitize} from './llm';
import {mergeGraph} from '../lib/graphMerge';
import type {Concept} from '../types';
import type {Edge} from '@xyflow/react';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

describe('mock conversation',()=>{
 it('provides valid standalone samples with verbatim quotes and existing endpoints',()=>{
  for(const sample of demoScenarios){
   const result=getMockResult(sample.question);
   expect(parseAndSanitize(JSON.stringify(result),[],sample.question)).toEqual(result);
   for(const node of result.nodes){expect(node.evidence?.source==='user'?sample.question:result.chatResponse).toContain(node.quote);expect(node.quote.length).toBeLessThan(200);}
   expect(result.nodes.length).toBeGreaterThanOrEqual(3);
  }
 });
 it('accumulates the walkthrough without moving existing nodes or duplicating concepts',()=>{
  let nodes:Concept[]=[],edges:Edge[]=[];
  const counts=[[5,5],[7,8],[10,12],[13,16]];
  demoScenarios.forEach((sample,i)=>{
   if(i===1)nodes=nodes.map(n=>n.id==='interviews'?{...n,position:{x:-100,y:700}}:n);
   const oldPositions=nodes.map(n=>({id:n.id,position:n.position}));
   const merged=mergeGraph(nodes,edges,getMockResult(sample.question),`reply-${i}`);
   nodes=merged.nodes;edges=merged.edges;
   expect([nodes.length,edges.length]).toEqual(counts[i]);
   oldPositions.forEach(old=>expect(nodes.find(n=>n.id===old.id)?.position).toEqual(old.position));
  });
  const repeated=mergeGraph(nodes,edges,getMockResult(demoScenarios[0].question),'repeat');
  expect([repeated.nodes.length,repeated.edges.length]).toEqual([13,16]);
  expect(repeated.addedNodeIds).toEqual([]);
 });
 it('returns independent fixtures and a helpful response for unknown questions',()=>{
  const sample=getMockResult(demoScenarios[0].question);sample.nodes[0].label='Changed';
  expect(getMockResult(demoScenarios[0].question).nodes[0].label).toBe('Interviews');
  expect(getMockResult('How does coding work?').nodes.some(n=>n.id==='coding')).toBe(true);
  expect(getMockResult('Tell me about space').nodes).toEqual([]);
 });
 it('simulates a short wait without any network request',async()=>{
  vi.useFakeTimers();const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  const reply=askMockLLM([{role:'user',content:demoScenarios[1].question}],[]);
  await vi.advanceTimersByTimeAsync(650);
  expect(await reply).toEqual(demoScenarios[1].result);
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('cancels an in-flight mock reply on Reset',async()=>{
  vi.useFakeTimers();const controller=new AbortController();
  const pending=expect(askMockLLM([],[],controller.signal)).rejects.toMatchObject({name:'AbortError'});
  controller.abort();await pending;expect(vi.getTimerCount()).toBe(0);
 });
 it('does not start a timer for an already aborted request',async()=>{
  vi.useFakeTimers();const controller=new AbortController();controller.abort();
  await expect(askMockLLM([],[],controller.signal)).rejects.toMatchObject({name:'AbortError'});
  expect(vi.getTimerCount()).toBe(0);
 });
});
