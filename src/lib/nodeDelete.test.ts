import {describe,expect,it} from 'vitest';
import {deleteTopic,restoreTopic} from './nodeDelete';
import {mergeGraph} from './graphMerge';
import {getMockResult} from '../services/mockLLM';
import {addConnection,deleteConnection,renameConnection} from './connections';
import {createWorkspace,parseWorkspace} from './workspace';
import {createChatSession} from './sessions';

const graph=()=>{
 const burger=mergeGraph([],[],getMockResult('How to make a burger'),'a1','q1','How to make a burger','chat-a');
 const spaghetti=mergeGraph(burger.nodes,burger.edges,getMockResult('How do I make spaghetti?',burger.nodes.map(node=>({id:node.id,label:node.data.label}))),'a2','q2','How do I make spaghetti?','chat-b');
 return mergeGraph(spaghetti.nodes,spaghetti.edges,getMockResult('How do I caramelize onions for my burger?'),'a3','q3','How do I caramelize onions for my burger?','chat-c');
};

describe('cascading topic deletion',()=>{
 it('removes all incoming, outgoing, shared, and manual connections while preserving other topics and links',()=>{
  const initial=graph();
  const manual=addConnection(initial.nodes,initial.edges,[],{source:'make-a-burger',target:'make-spaghetti',label:'Try next',directed:true});
  const independent=addConnection(initial.nodes,manual.edges,[],{source:'caramelize-onions',target:'make-spaghetti',label:'Dinner',directed:false});
  const before=structuredClone({nodes:initial.nodes,edges:independent.edges});
  const deleted=deleteTopic(initial.nodes,independent.edges,[],'make-a-burger');
  expect(initial.nodes).toEqual(before.nodes);expect(independent.edges).toEqual(before.edges);
  expect(deleted.nodes.map(node=>node.id)).toEqual(['make-spaghetti','caramelize-onions']);
  expect(deleted.edges).toHaveLength(1);expect(deleted.edges[0].label).toBe('Dinner');
  expect(deleted.deleted?.edges).toHaveLength(3);expect(deleted.deletedNodeIds).toEqual(['make-a-burger']);
 });
 it('leaves original chat messages intact and lets source chips disappear by node lookup',()=>{
  const initial=graph(),session=createChatSession();
  session.messages=[{id:'q1',role:'user',content:'How to make a burger',createdAt:1},{id:'a1',role:'assistant',content:getMockResult('How to make a burger').chatResponse,createdAt:2,nodeIds:['make-a-burger']}];
  const before=structuredClone(session);
  const deleted=deleteTopic(initial.nodes,initial.edges,[],'make-a-burger');
  expect(session).toEqual(before);expect(session.messages).toHaveLength(2);
  expect(session.messages[1].nodeIds?.some(id=>deleted.nodes.some(node=>node.id===id))).toBe(false);
 });
 it('suppresses a deleted topic and its edges even when an in-flight response has a stale graph snapshot',()=>{
  const initial=graph(),deleted=deleteTopic(initial.nodes,initial.edges,[],'make-a-burger');
  const result=getMockResult('How to make a burger');
  result.edges.push({source:'make-a-burger',target:'make-spaghetti',relationship:'cooking',kind:'shared_topic'});
  const merged=mergeGraph(initial.nodes,initial.edges,result,'late-answer','q4','How to make a burger','chat-d',[],deleted.deletedNodeIds);
  expect(merged.nodes.some(node=>node.id==='make-a-burger')).toBe(false);
  expect(merged.edges.some(edge=>edge.source==='make-a-burger'||edge.target==='make-a-burger')).toBe(false);
  expect(merged.addedNodeIds).toEqual([]);
 });
 it('undo restores the topic, answers, details, dragged position, and renamed connections',()=>{
  const initial=graph();initial.nodes[0].position={x:1000,y:800};initial.nodes[0].data.details='My own recipe notes';
  const edited=renameConnection(initial.edges,initial.edges[0].id,'Family recipes');
  const deleted=deleteTopic(initial.nodes,edited,[],'make-a-burger');
  const restored=restoreTopic(deleted.nodes,deleted.edges,deleted.deletedNodeIds,[],deleted.deleted!);
  const burger=restored.nodes.find(node=>node.id==='make-a-burger')!;
  expect(burger.position).toEqual({x:1000,y:800});expect(burger.data.details).toBe('My own recipe notes');
  expect(burger.data.answers).toEqual(initial.nodes[0].data.answers);expect(burger.data.isNew).toBe(false);expect(burger.selected).toBe(false);
  expect(restored.edges.map(edge=>edge.label)).toEqual(['Family recipes','optional topping for']);expect(restored.deletedNodeIds).toEqual([]);
 });
 it('undo does not restore links to another deleted topic or links explicitly deleted separately',()=>{
  const initial=graph(),a=deleteTopic(initial.nodes,initial.edges,[],'make-a-burger');
  const b=deleteTopic(a.nodes,a.edges,a.deletedNodeIds,'make-spaghetti');
  const blocked=deleteConnection(initial.edges,[],initial.edges[1].id).deletedConnections;
  const restored=restoreTopic(b.nodes,b.edges,b.deletedNodeIds,blocked,a.deleted!);
  expect(restored.nodes.some(node=>node.id==='make-a-burger')).toBe(true);
  expect(restored.edges).toEqual([]);expect(restored.deletedNodeIds).toEqual(['make-spaghetti']);
 });
 it('handles isolated, last, and already missing topics without errors',()=>{
  const initial=mergeGraph([],[],getMockResult('How to make a burger'),'a1');
  const deleted=deleteTopic(initial.nodes,[],[],'make-a-burger');
  expect(deleted.nodes).toEqual([]);expect(deleted.edges).toEqual([]);
  const again=deleteTopic(deleted.nodes,deleted.edges,deleted.deletedNodeIds,'make-a-burger');
  expect(again.deleted).toBeUndefined();expect(again.deletedNodeIds).toEqual(['make-a-burger']);
 });
 it('persists deletion with a valid graph, and keeps older workspaces compatible',()=>{
  const initial=graph(),deleted=deleteTopic(initial.nodes,initial.edges,[],'make-a-burger');
  const restored=parseWorkspace(JSON.stringify({...createWorkspace(),nodes:deleted.nodes,edges:deleted.edges,deletedNodeIds:deleted.deletedNodeIds}))!;
  expect(restored.nodes).toHaveLength(2);expect(restored.edges).toEqual([]);expect(restored.deletedNodeIds).toEqual(['make-a-burger']);
  const older=createWorkspace();delete older.deletedNodeIds;
  expect(parseWorkspace(JSON.stringify(older))?.deletedNodeIds).toEqual([]);
  expect(parseWorkspace(JSON.stringify({...createWorkspace(),deletedNodeIds:[null]}))).toBeNull();
 });
 it('repeated undo does not duplicate restored nodes or connections',()=>{
  const initial=graph(),deleted=deleteTopic(initial.nodes,initial.edges,[],'make-a-burger');
  const once=restoreTopic(deleted.nodes,deleted.edges,deleted.deletedNodeIds,[],deleted.deleted!);
  const twice=restoreTopic(once.nodes,once.edges,once.deletedNodeIds,[],deleted.deleted!);
  expect(twice.nodes).toHaveLength(3);expect(twice.edges).toHaveLength(2);
 });
});
