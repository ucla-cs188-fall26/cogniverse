import {MarkerType,type Edge} from '@xyflow/react';
import type {Concept,GraphEvidence} from '../types';

export interface ConnectionData extends Record<string,unknown> {
 relationship:string;
 kind?:'shared_topic';
 evidence?:GraphEvidence;
 userCreated?:boolean;
 manuallyEdited?:boolean;
 originalRelationship?:string;
}
export interface ConnectionDraft {source:string;target:string;label:string;directed:boolean}
export interface ConnectionState {edges:Edge[];deletedConnections:string[]}

const normalizedName=(name:string)=>name.trim().replace(/[_\s]+/g,' ').toLowerCase();
export function connectionKey(source:string,target:string,label:string,shared:boolean):string {
 const pair=shared?[source,target].sort():[source,target];
 return JSON.stringify([shared?'shared':'directed',...pair,normalizedName(label)]);
}
export function connectionKeys(edge:Edge):string[] {
 const data=edge.data as ConnectionData;
 return [...new Set([data.relationship,data.originalRelationship].filter((value):value is string=>Boolean(value))
  .map(label=>connectionKey(edge.source,edge.target,label,data.kind==='shared_topic')))];
}
export function styledConnection(id:string,source:string,target:string,data:ConnectionData):Edge {
 const shared=data.kind==='shared_topic';
 const original=data.originalRelationship??data.relationship;
 return {
  id,source,target,data,
  label:data.userCreated||data.manuallyEdited?data.relationship:data.relationship.replace(/_/g,' '),
  markerEnd:shared?undefined:{type:MarkerType.ArrowClosed,color:'#9aa5b3'},
  style:{stroke:'#9aa5b3',strokeDasharray:shared?'4 4':original==='supports'?'6 4':original==='relates_to'?'2 4':undefined},
  labelStyle:{fontSize:10,fill:'#718096'},labelBgStyle:{fill:'#f8fafb'},labelBgPadding:[6,4],interactionWidth:24,
 };
}
function validateLabel(label:string):string {
 const value=label.trim();
 if(!value)throw new Error('Give this connection a name.');
 if(value.length>80)throw new Error('Use a connection name of 80 characters or fewer.');
 return value;
}
function duplicate(edges:Edge[],source:string,target:string,label:string,shared:boolean,except?:string):boolean {
 const key=connectionKey(source,target,label,shared);
 return edges.some(edge=>edge.id!==except&&connectionKey(edge.source,edge.target,String(edge.data?.relationship??''),edge.data?.kind==='shared_topic')===key);
}
export function addConnection(nodes:Concept[],edges:Edge[],deletedConnections:string[],draft:ConnectionDraft):ConnectionState {
 const label=validateLabel(draft.label);
 if(!nodes.some(node=>node.id===draft.source)||!nodes.some(node=>node.id===draft.target))throw new Error('Choose two existing topics.');
 if(draft.source===draft.target)throw new Error('Choose two different topics.');
 const shared=!draft.directed;
 if(duplicate(edges,draft.source,draft.target,label,shared))throw new Error('This connection already exists.');
 const edge=styledConnection(`manual-${crypto.randomUUID()}`,draft.source,draft.target,{relationship:label,userCreated:true,...(shared?{kind:'shared_topic' as const}:{})});
 const keys=new Set(connectionKeys(edge));
 return {edges:[...edges,edge],deletedConnections:deletedConnections.filter(key=>!keys.has(key))};
}
export function renameConnection(edges:Edge[],id:string,newLabel:string):Edge[] {
 const label=validateLabel(newLabel),edge=edges.find(item=>item.id===id);
 if(!edge)throw new Error('This connection no longer exists.');
 if(duplicate(edges,edge.source,edge.target,label,edge.data?.kind==='shared_topic',id))throw new Error('A connection with this name already exists between these topics.');
 if(edge.label===label)return edges;
 const data=edge.data as ConnectionData;
 return edges.map(item=>item.id!==id?item:{...styledConnection(edge.id,edge.source,edge.target,{
  ...data,relationship:label,originalRelationship:data.originalRelationship??data.relationship,manuallyEdited:true,
 }),selected:edge.selected});
}
export function deleteConnection(edges:Edge[],deletedConnections:string[],id:string):ConnectionState {
 const edge=edges.find(item=>item.id===id);
 if(!edge)return {edges,deletedConnections};
 return {edges:edges.filter(item=>item.id!==id),deletedConnections:[...new Set([...deletedConnections,...connectionKeys(edge)])]};
}
