import {MarkerType,type Edge} from '@xyflow/react';
import type {Concept,LLMResult,TopicAnswer} from '../types';
import {layout} from './layout';

export function mergeGraph(existingNodes:Concept[],existingEdges:Edge[],result:LLMResult,messageId:string,userMessageId?:string,userPrompt='',sessionId?:string){
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
 const edges=[...existingEdges],edgeIds=new Set(edges.map(edge=>edge.id));
 result.edges.forEach(edge=>{
  const id=`${edge.source}__${edge.relationship}__${edge.target}`;
  if(edge.kind==='shared_topic'&&edges.some(old=>old.data?.kind==='shared_topic'&&old.data.relationship===edge.relationship&&((old.source===edge.source&&old.target===edge.target)||(old.source===edge.target&&old.target===edge.source))))return;
  if(edge.source===edge.target||!ids.has(edge.source)||!ids.has(edge.target)||edgeIds.has(id))return;
  edgeIds.add(id);
  edges.push({
   id,source:edge.source,target:edge.target,label:edge.relationship.replace(/_/g,' '),
   data:{relationship:edge.relationship,...(edge.kind?{kind:edge.kind}:{}),...(edge.evidence?{evidence:{...edge.evidence,messageId:edge.evidence.source==='user'?userMessageId:messageId,...(sessionId?{sessionId}:{})}}:{})},
   markerEnd:edge.kind==='shared_topic'?undefined:{type:MarkerType.ArrowClosed,color:'#9aa5b3'},
   style:{stroke:'#9aa5b3',strokeDasharray:edge.kind==='shared_topic'?'4 4':edge.relationship==='supports'?'6 4':edge.relationship==='relates_to'?'2 4':undefined},
   labelStyle:{fontSize:10,fill:'#718096'},labelBgStyle:{fill:'#f8fafb'},labelBgPadding:[6,4],
  });
 });
 return {nodes,edges,addedNodeIds:fresh.map(node=>node.id)};
}
