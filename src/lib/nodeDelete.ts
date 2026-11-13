import type {Edge} from '@xyflow/react';
import type {Concept} from '../types';
import {connectionKeys} from './connections';

export interface DeletedTopic {node:Concept;edges:Edge[]}
export function deleteTopic(nodes:Concept[],edges:Edge[],deletedNodeIds:string[],id:string){
 const node=nodes.find(item=>item.id===id);
 if(!node)return {nodes,edges,deletedNodeIds,deleted:undefined};
 const incident=edges.filter(edge=>edge.source===id||edge.target===id);
 return {
  nodes:nodes.filter(item=>item.id!==id),
  edges:edges.filter(edge=>edge.source!==id&&edge.target!==id),
  deletedNodeIds:[...new Set([...deletedNodeIds,id])],
  deleted:{node,edges:incident} as DeletedTopic,
 };
}

export function restoreTopic(nodes:Concept[],edges:Edge[],deletedNodeIds:string[],deletedConnections:string[],deleted:DeletedTopic){
 const restored=nodes.some(node=>node.id===deleted.node.id)?nodes:[...nodes,{
  ...deleted.node,selected:false,data:{...deleted.node.data,isNew:false},
 }];
 const ids=new Set(restored.map(node=>node.id)),edgeIds=new Set(edges.map(edge=>edge.id));
 const blocked=new Set(deletedConnections);
 const reserved=new Set(edges.flatMap(connectionKeys));
 const restoredEdges=[...edges];
 for(const edge of deleted.edges){
  const keys=connectionKeys(edge);
  if(!ids.has(edge.source)||!ids.has(edge.target)||edgeIds.has(edge.id)||keys.some(key=>blocked.has(key)||reserved.has(key)))continue;
  restoredEdges.push({...edge,selected:false});edgeIds.add(edge.id);keys.forEach(key=>reserved.add(key));
 }
 return {nodes:restored,edges:restoredEdges,deletedNodeIds:deletedNodeIds.filter(id=>id!==deleted.node.id)};
}
