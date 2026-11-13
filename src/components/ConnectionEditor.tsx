import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowRight,Check,Link2,Trash2,X} from 'lucide-react';
import type {Edge} from '@xyflow/react';
import type {Concept,GraphEvidence} from '../types';
import type {ConnectionDraft} from '../lib/connections';

export interface ConnectionEditorRequest {edgeId?:string;sourceId?:string;targetId?:string;returnNodeId?:string}
type Props={request:ConnectionEditorRequest|null;nodes:Concept[];edges:Edge[];onClose:()=>void;onSave:(draft:ConnectionDraft,edgeId?:string)=>string|undefined;onDelete:(id:string)=>void;onShowChat:(id:string)=>void};

function ConnectionForm({request,nodes,edge,onClose,onSave,onDelete,onShowChat}:Omit<Props,'request'|'edges'>&{request:ConnectionEditorRequest;edge:Edge|undefined}){
 const [draft,setDraft]=useState<ConnectionDraft>(()=>{
  const source=edge?.source??request.sourceId??nodes[0]?.id??'';
  return {source,target:edge?.target??request.targetId??nodes.find(node=>node.id!==source)?.id??'',label:edge?String(edge.label??edge.data?.relationship??''):'',directed:edge?edge.data?.kind!=='shared_topic':Boolean(request.targetId)};
 });
 const [error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{input.current?.focus({preventScroll:true});input.current?.select();},[]);
 const source=nodes.find(node=>node.id===draft.source),target=nodes.find(node=>node.id===draft.target);
 const evidence=edge?.data?.evidence as GraphEvidence|undefined;
 return <form className="concept-editor connection-editor" onSubmit={event=>{
  event.preventDefault();const error=onSave(draft,request.edgeId);if(error)setError(error);
 }}>
  <h2>{request.edgeId?'Edit connection':'Add connection'}</h2>
  <p className="editor-hint">Changes apply to the shared graph across all chats and are saved in this browser.</p>
  {request.edgeId?<div className="connection-endpoints"><span>{source?.data.label??'Missing topic'}</span><span>{draft.directed?<ArrowRight size={16}/>:<Link2 size={16}/>}</span><span>{target?.data.label??'Missing topic'}</span></div>:<>
   <label htmlFor="connection-source">From topic</label>
   <select id="connection-source" value={draft.source} onChange={event=>{
    const source=event.target.value;setError('');setDraft({...draft,source,target:source===draft.target?nodes.find(node=>node.id!==source)?.id??'':draft.target});
   }}>{nodes.map(node=><option value={node.id} key={node.id}>{node.data.label}</option>)}</select>
   <label htmlFor="connection-target">To topic</label>
   <select id="connection-target" value={draft.target} onChange={event=>{setError('');setDraft({...draft,target:event.target.value});}}>
    {nodes.filter(node=>node.id!==draft.source).map(node=><option value={node.id} key={node.id}>{node.data.label}</option>)}
   </select>
  </>}
  <label htmlFor="connection-label">Connection name</label>
  <input id="connection-label" ref={input} required maxLength={80} placeholder="e.g. cooking" value={draft.label} aria-invalid={Boolean(error)} aria-describedby={error?'connection-error':undefined} onChange={event=>{setDraft({...draft,label:event.target.value});setError('');}}/>
  {!request.edgeId&&<><label htmlFor="connection-direction">Connection type</label><select id="connection-direction" value={draft.directed?'directed':'shared'} onChange={event=>{setDraft({...draft,directed:event.target.value==='directed'});setError('');}}><option value="shared">Shared connection (no arrow)</option><option value="directed">Directional (from → to)</option></select></>}
  <p className="editor-hint">{draft.directed?'The arrow points from the first topic to the second.':'This connection has no direction, like a shared interest in cooking.'}</p>
  {edge&&<section><h3>{edge.data?.userCreated?'Created by you':edge.data?.manuallyEdited?'Edited by you':'Original connection'}</h3>
   {Boolean(edge.data?.originalRelationship)&&<p className="editor-hint">Original name: {String(edge.data?.originalRelationship).replace(/_/g,' ')}</p>}
   {evidence&&<><blockquote>{evidence.quote}</blockquote><p className="editor-hint">This excerpt supports the original connection name.</p>{evidence.messageId&&<button type="button" className="text-button" onClick={()=>onShowChat(evidence.messageId!)}>Show original source in chat <ArrowRight size={13}/></button>}</>}
  </section>}
  {error&&<p id="connection-error" className="editor-error" role="alert">{error}</p>}
  <div className="editor-actions"><button type="button" className="cancel-edit" onClick={onClose}>Cancel</button><button type="submit" className="save-edit" disabled={nodes.length<2||Boolean(request.edgeId&&!edge)}><Check size={14}/>{request.edgeId?'Save changes':'Add connection'}</button></div>
  {edge&&<button type="button" className="delete-connection" onClick={()=>onDelete(edge.id)}><Trash2 size={14}/>Delete connection</button>}
 </form>;
}

export function ConnectionEditor({request,nodes,edges,onClose,onSave,onDelete,onShowChat}:Props){
 const open=Boolean(request);
 useLayoutEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  return()=>{if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose();}};
  window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
 },[open,onClose]);
 return <aside role="dialog" aria-modal="false" aria-label="Connection details" aria-hidden={!open} className={`inspector connection-drawer ${open?'open':''}`}>
  {request&&<><div className="inspector-top"><span className="eyebrow">CONNECTION DETAILS</span><button type="button" className="icon-button" aria-label="Close connection editor" onClick={onClose}><X size={18}/></button></div>
   <ConnectionForm key={request.edgeId??`new-${request.sourceId??''}-${request.targetId??''}`} request={request} nodes={nodes} edge={edges.find(edge=>edge.id===request.edgeId)} onClose={onClose} onSave={onSave} onDelete={onDelete} onShowChat={onShowChat}/>
  </>}
 </aside>;
}
