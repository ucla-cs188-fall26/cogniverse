import type {Edge} from '@xyflow/react';
import {connectionKey,connectionKeys,styledConnection} from './connections';
import type {Concept,LLMResult,TopicAnswer} from '../types';
import {layout} from './layout';

export function mergeGraph(existingNodes:Concept[],existingEdges:Edge[],result:LLMResult,messageId:string,userMessageId?:string,userPrompt='',sessionId?:string,deletedConnections:readonly string[]=[]){
 const answer:TopicAnswer={messageId,questionMessageId:userMessageId,question:userPrompt,answer:result.chatResponse,...(sessionId?{sessionId}:{})};
 const nodes=existingNodes.map(node=>{
  const answers=node.data.answers??[];
  const attachAnswer=node.id===result.primaryTopicId&&!answers.some(item=>item.messageId===messageId);
  if(!node.data.isNew&&!attachAnswer)return node;
  return {...node,data:{...node.data,isNew:false,...(attachAnswer?{answers:[...answers,answer]}:{})}};
 });
 const ids=new Set(nodes.map(node=>node.id));
 const fresh=result.nodes.filter(node=>{if(ids.has(node.id))return false;ids.add(node.id);return true;});
 const positions=layout(existingNodes,fresh.length);
 fresh.forEach((node,index)=>nodes.push({
  id:node.id,type:'concept',position:positions[index],data:{
   label:node.label,summary:node.summary,quote:node.quote,...(node.focus?{focus:node.focus}:{}),
   firstSeenMessageId:node.evidence?.source==='user'?(userMessageId??messageId):messageId,
   ...(node.evidence?{evidence:{...node.evidence,messageId:node.evidence.source==='user'?userMessageId:messageId,...(sessionId?{sessionId}:{})}}:{}),
   ...(node.id===result.primaryTopicId?{answers:[answer]}:{}),isNew:true,
  },
 }));
 const blocked=new Set(deletedConnections);
 const edges=existingEdges.filter(edge=>!blocked.has(connectionKey(edge.source,edge.target,String(edge.data?.relationship??''),edge.data?.kind==='shared_topic'))),edgeIds=new Set(edges.map(edge=>edge.id));
 const reservedKeys=new Set(edges.flatMap(connectionKeys));
 result.edges.forEach(edge=>{
  const id=`${edge.source}__${edge.relationship}__${edge.target}`;
  const key=connectionKey(edge.source,edge.target,edge.relationship,edge.kind==='shared_topic');
  if(blocked.has(key)||reservedKeys.has(key))return;
  if(edge.source===edge.target||!ids.has(edge.source)||!ids.has(edge.target)||edgeIds.has(id))return;
  edgeIds.add(id);reservedKeys.add(key);
  edges.push(styledConnection(id,edge.source,edge.target,{
   relationship:edge.relationship,...(edge.kind?{kind:edge.kind}:{}),
   ...(edge.evidence?{evidence:{...edge.evidence,messageId:edge.evidence.source==='user'?userMessageId:messageId,...(sessionId?{sessionId}:{})}}:{}),
  }));
 });
 return {nodes,edges,addedNodeIds:fresh.map(node=>node.id)};
}
