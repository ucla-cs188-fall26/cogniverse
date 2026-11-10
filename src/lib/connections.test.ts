import {describe,expect,it} from 'vitest';
import {addConnection,connectionKeys,deleteConnection,renameConnection} from './connections';
import {mergeGraph} from './graphMerge';
import {createWorkspace,parseWorkspace} from './workspace';
import {getMockResult} from '../services/mockLLM';
import type {LLMResult} from '../types';

const initial=()=>{
 const a=mergeGraph([],[],getMockResult('How to make a burger'),'a1','q1','How to make a burger','chat-a');
 const result=getMockResult('How do I make spaghetti?',a.nodes.map(n=>({id:n.id,label:n.data.label})));
 return mergeGraph(a.nodes,a.edges,result,'a2','q2','How do I make spaghetti?','chat-b');
};
const suggestion:LLMResult={chatResponse:'Both dishes involve cooking.',nodes:[],edges:[{source:'make-spaghetti',target:'make-a-burger',relationship:'cooking',kind:'shared_topic'}]};
const draft={source:'make-a-burger',target:'make-spaghetti',label:'Dinner ideas',directed:false};

describe('user-managed connections',()=>{
 it('creates a labeled undirected link without modifying nodes or existing connections',()=>{
  const graph=initial(),before=structuredClone(graph);
  const result=addConnection(graph.nodes,graph.edges,[],draft);
  expect(graph).toEqual(before);expect(result.edges).toHaveLength(2);
  expect(result.edges[1]).toMatchObject({source:draft.source,target:draft.target,label:'Dinner ideas',data:{relationship:'Dinner ideas',userCreated:true,kind:'shared_topic'}});
  expect(result.edges[1].markerEnd).toBeUndefined();
 });
 it('can create a directional link with an arrow and preserves arbitrary label punctuation',()=>{
  const graph=initial();const result=addConnection(graph.nodes,graph.edges,[],{...draft,label:'Cooks → serves',directed:true});
  expect(result.edges.at(-1)?.markerEnd).toBeDefined();expect(result.edges.at(-1)?.label).toBe('Cooks → serves');
 });
 it.each([
  {...draft,label:'  '}, {...draft,label:'x'.repeat(81)}, {...draft,target:draft.source}, {...draft,target:'missing'},
 ])('rejects invalid names, missing endpoints, and self-links: %j',invalid=>{
  const graph=initial();expect(()=>addConnection(graph.nodes,graph.edges,[],invalid)).toThrow();
 });
 it('prevents duplicate shared links even when endpoints are reversed or names differ only in case',()=>{
  const graph=initial();expect(()=>addConnection(graph.nodes,graph.edges,[],{...draft,label:'COOKING'})).toThrow('already exists');
  expect(()=>addConnection(graph.nodes,graph.edges,[],{source:draft.target,target:draft.source,label:'cooking',directed:false})).toThrow('already exists');
 });
 it('renames in place, retains provenance, and prevents later automatic suggestions from restoring old names',()=>{
  const graph=initial(),id=graph.edges[0].id;
  const renamed=renameConnection(graph.edges,id,'Shared recipes');
  expect(graph.edges[0].label).toBe('cooking');expect(renamed[0].id).toBe(id);
  expect(renamed[0].data).toMatchObject({relationship:'Shared recipes',originalRelationship:'cooking',manuallyEdited:true});
  const merged=mergeGraph(graph.nodes,renamed,suggestion,'a3','q3');
  expect(merged.edges).toHaveLength(1);expect(merged.edges[0].label).toBe('Shared recipes');
  const sameNewName={...suggestion,edges:[{...suggestion.edges[0],relationship:'shared_recipes'}]};
  expect(mergeGraph(graph.nodes,renamed,sameNewName,'a4').edges).toHaveLength(1);
 });
 it('retains the original supporting excerpt when a factual connection is renamed',()=>{
  const graph=initial();
  const factual=mergeGraph(graph.nodes,graph.edges,getMockResult('How do I caramelize onions for my burger?'),'a3','q3','How do I caramelize onions for my burger?','chat-c');
  const edge=factual.edges.find(edge=>edge.data?.relationship==='optional_topping_for')!;
  const renamed=renameConnection(factual.edges,edge.id,'Great topping');
  expect(renamed.find(item=>item.id===edge.id)?.data?.evidence).toEqual(edge.data?.evidence);
  expect(renamed.find(item=>item.id===edge.id)?.markerEnd).toBeDefined();
 });
 it('rejects blank or conflicting renames',()=>{
  const graph=initial();const added=addConnection(graph.nodes,graph.edges,[],draft);
  expect(()=>renameConnection(added.edges,graph.edges[0].id,' ')).toThrow();
  expect(()=>renameConnection(added.edges,graph.edges[0].id,'Dinner ideas')).toThrow('already exists');
 });
 it('deletes links without deleting nodes, and suppresses later suggestions in either direction',()=>{
  const graph=initial(),before=structuredClone(graph.nodes);
  const deleted=deleteConnection(graph.edges,[],graph.edges[0].id);
  expect(deleted.edges).toEqual([]);expect(graph.nodes).toEqual(before);
  expect(mergeGraph(graph.nodes,deleted.edges,suggestion,'a3','q3','',undefined,deleted.deletedConnections).edges).toEqual([]);
  const reversed={...suggestion,edges:[{...suggestion.edges[0],source:'make-a-burger',target:'make-spaghetti'}]};
  expect(mergeGraph(graph.nodes,deleted.edges,reversed,'a4','q4','',undefined,deleted.deletedConnections).edges).toEqual([]);
 });
 it('suppresses both original and edited names after a renamed connection is deleted',()=>{
  const graph=initial(),renamed=renameConnection(graph.edges,graph.edges[0].id,'Shared recipes');
  const deleted=deleteConnection(renamed,[],renamed[0].id);
  expect(deleted.deletedConnections).toHaveLength(2);
  expect(mergeGraph(graph.nodes,deleted.edges,suggestion,'a3','q3','',undefined,deleted.deletedConnections).edges).toEqual([]);
  expect(mergeGraph(graph.nodes,deleted.edges,{...suggestion,edges:[{...suggestion.edges[0],relationship:'shared_recipes'}]},'a4','q4','',undefined,deleted.deletedConnections).edges).toEqual([]);
 });
 it('allows the user to explicitly recreate a deleted link',()=>{
  const graph=initial();const deleted=deleteConnection(graph.edges,[],graph.edges[0].id);
  const restored=addConnection(graph.nodes,deleted.edges,deleted.deletedConnections,{...draft,label:'cooking'});
  expect(restored.deletedConnections).toEqual([]);
  expect(mergeGraph(graph.nodes,restored.edges,suggestion,'a3','q3','',undefined,restored.deletedConnections).edges).toHaveLength(1);
 });
 it('handles stale edge snapshots while a reply is in flight and does not remove surviving edited links',()=>{
  const graph=initial();const renamed=renameConnection(graph.edges,graph.edges[0].id,'Shared recipes');
  const explicit=addConnection(graph.nodes,renamed,[],{...draft,label:'cooking'});
  const deleted=deleteConnection(explicit.edges,[],explicit.edges[1].id);
  const merged=mergeGraph(graph.nodes,explicit.edges,suggestion,'a3','q3','',undefined,deleted.deletedConnections);
  expect(merged.edges).toHaveLength(1);expect(merged.edges[0].label).toBe('Shared recipes');
 });
 it('persists manual labels, provenance metadata, and deletions across reloads',()=>{
  const graph=initial();const added=addConnection(graph.nodes,graph.edges,[],draft);
  const renamed=renameConnection(added.edges,graph.edges[0].id,'Shared recipes');
  const deleted=deleteConnection(renamed,[],renamed[1].id);
  const workspace={...createWorkspace(),nodes:graph.nodes,edges:deleted.edges,deletedConnections:deleted.deletedConnections};
  const restored=parseWorkspace(JSON.stringify(workspace))!;
  expect(restored.edges[0].label).toBe('Shared recipes');expect(restored.edges[0].data?.originalRelationship).toBe('cooking');
  expect(restored.deletedConnections).toEqual(deleted.deletedConnections);
  expect(connectionKeys(restored.edges[0])).toEqual(connectionKeys(renamed[0]));
 });
});
