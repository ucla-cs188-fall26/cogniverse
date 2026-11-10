import {useEffect,useRef,useState} from 'react';
import {ArrowDownLeft,ArrowUpRight,X,Quote,ArrowRight,Pencil,Check,Plus} from 'lucide-react';
import type {Edge} from '@xyflow/react';
import {type Concept,type GraphEvidence} from '../types';
import type {ConceptEdits} from '../lib/nodeEdit';

type InspectorProps={
 node:Concept|undefined;
 sessionTitles?:Record<string,string>;
 nodes:Concept[];
 edges:Edge[];
 onClose:()=>void;
 onSelect:(id:string)=>void;
 onShowChat:(id:string)=>void;
 onSave:(id:string,edits:ConceptEdits)=>void;
 onAddConnection:(nodeId:string)=>void;
 onEditConnection:(edgeId:string)=>void;
};

function ConceptEditor({node,onSave,onCancel}:{node:Concept;onSave:InspectorProps['onSave'];onCancel:()=>void}){
 const [draft,setDraft]=useState<ConceptEdits>({
  label:node.data.label,
  summary:node.data.summary||'',quote:node.data.quote||'',
  details:node.data.details??node.data.answers?.at(-1)?.answer??'',
 });
 const [error,setError]=useState('');
 const labelInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{labelInput.current?.focus();},[]);
 return <form className="concept-editor" onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCancel();}
 }} onSubmit={event=>{
  event.preventDefault();
  if(!draft.label.trim()){setError('Give this topic a name.');labelInput.current?.focus();return;}
  const originalDetails=node.data.details??node.data.answers?.at(-1)?.answer??'';
  onSave(node.id,{...draft,details:node.data.details===undefined&&draft.details===originalDetails?undefined:draft.details});
 }}>
  <h2>Edit topic</h2>
  <p className="editor-hint">Changes update the graph and concept chips. The original chat reply and source evidence stay unchanged.</p>
  <label htmlFor="concept-label">Topic name</label>
  <input id="concept-label" ref={labelInput} required maxLength={200} value={draft.label}
   aria-invalid={Boolean(error)} aria-describedby={error?'concept-edit-error':undefined}
   onChange={event=>{setDraft({...draft,label:event.target.value});setError('');}}/>
  <label htmlFor="concept-summary">Summary</label>
  <textarea id="concept-summary" rows={5} maxLength={4000} value={draft.summary} onChange={event=>setDraft({...draft,summary:event.target.value})}/>
  <label htmlFor="concept-details">Full answer / details</label>
  <textarea id="concept-details" rows={12} value={draft.details??''} onChange={event=>setDraft({...draft,details:event.target.value})}/>
  <p className="editor-hint">Your edited details stay here. Original answers remain in the answer history.</p>
  <label htmlFor="concept-quote">Context / excerpt</label>
  <textarea id="concept-quote" rows={4} maxLength={2000} value={draft.quote} onChange={event=>setDraft({...draft,quote:event.target.value})}/>
  {error&&<p id="concept-edit-error" role="alert" className="editor-error">{error}</p>}
  <div className="editor-actions">
   <button type="button" className="cancel-edit" onClick={onCancel}>Cancel</button>
   <button type="submit" className="save-edit"><Check size={14}/>Save changes</button>
  </div>
  <p className="editor-hint">Edits are saved in this browser and included in graph exports.</p>
 </form>;
}

function InspectorContent({node,nodes,edges,onSelect,onShowChat,onSave,sessionTitles,onAddConnection,onEditConnection}:{node:Concept}&Pick<InspectorProps,'nodes'|'edges'|'onSelect'|'onShowChat'|'onSave'|'sessionTitles'|'onAddConnection'|'onEditConnection'>){
 const [editing,setEditing]=useState(false);
 const [saved,setSaved]=useState(false);
 const editButton=useRef<HTMLButtonElement>(null);
 const restoreFocus=()=>requestAnimationFrame(()=>editButton.current?.focus());
 const answers=node.data.answers??[];
 const latestAnswer=answers.at(-1);
 const fullAnswer=node.data.details??latestAnswer?.answer;
 const connections=edges.filter(edge=>edge.source===node.id||edge.target===node.id);
 if(editing)return <ConceptEditor node={node} onCancel={()=>{setEditing(false);restoreFocus();}} onSave={(id,edits)=>{
  onSave(id,edits);setEditing(false);setSaved(true);restoreFocus();
 }}/>;
 return <>
  <div className="concept-detail-toolbar"><span className="eyebrow">TOPIC</span>
   <button ref={editButton} className="edit-concept" onClick={()=>{setSaved(false);setEditing(true);}}><Pencil size={13}/>Edit topic</button>
  </div>
  {saved&&<p className="edit-saved" role="status">Changes saved.</p>}
  <h2>{node.data.label}</h2>
  <section><h3>Overview</h3><p>{node.data.summary||'No summary available.'}</p></section>
  {fullAnswer!==undefined&&<section className="topic-full-answer"><h3>{node.data.details!==undefined?'Your details':'Full answer'}</h3>
   {latestAnswer&&<p className="answer-question">{latestAnswer.sessionId&&sessionTitles?.[latestAnswer.sessionId]&&<span className="answer-session">From {sessionTitles[latestAnswer.sessionId]}</span>}{latestAnswer.question}</p>}
   <div className="answer-content">{fullAnswer||'No details added yet.'}</div>
   {latestAnswer&&<button className="text-button" onClick={()=>onShowChat(latestAnswer.messageId)}>Show answer in chat <ArrowRight size={14}/></button>}
  </section>}
  {(answers.length>1||node.data.details!==undefined)&&answers.length>0&&<section className="answer-history"><h3>Original answers <span>{answers.length}</span></h3>
   {[...answers].reverse().map((answer,index)=><details key={answer.messageId}><summary>{answer.question||`Answer ${answers.length-index}`}{answer.sessionId&&sessionTitles?.[answer.sessionId]&&<span className="answer-session">{sessionTitles[answer.sessionId]}</span>}</summary><div className="answer-content">{answer.answer}</div><button className="text-button" onClick={()=>onShowChat(answer.messageId)}>Show in chat <ArrowRight size={14}/></button></details>)}
  </section>}
  <section><h3><Quote size={14}/> Original evidence</h3>
   {node.data.evidence&&<span className="evidence-source">{node.data.evidence.source==='user'?'Your prompt':'AI answer'}{node.data.evidence.sessionId&&sessionTitles?.[node.data.evidence.sessionId]?` · ${sessionTitles[node.data.evidence.sessionId]}`:''}</span>}
   <blockquote>{node.data.evidence?.quote||node.data.quote||'No excerpt available.'}</blockquote>
   <button className="text-button" onClick={()=>onShowChat(node.data.evidence?.messageId||node.data.firstSeenMessageId)}>Show in chat <ArrowRight size={14}/></button>
  </section>
  {node.data.evidence&&node.data.quote!==node.data.evidence.quote&&<section><h3>Edited context</h3><p>{node.data.quote||'No excerpt available.'}</p></section>}
  <section><div className="connections-heading"><h3>Connected topics <span>{connections.length}</span></h3><button className="text-button" disabled={nodes.length<2} onClick={()=>onAddConnection(node.id)}><Plus size={13}/>Add</button></div>
   <div className="connections">{connections.length?connections.map(edge=>{
    const outgoing=edge.source===node.id;
    const neighbor=nodes.find(item=>item.id===(outgoing?edge.target:edge.source));
    const evidence=edge.data?.evidence as GraphEvidence|undefined;
    return neighbor&&<div key={edge.id} className="connection-row"><button className="connection-neighbor" onClick={()=>onSelect(neighbor.id)}>
     <div className="relation">{edge.data?.kind==='shared_topic'?(edge.data?.userCreated||edge.data?.manuallyEdited?'Connection:':'Shared topic:'):outgoing?<ArrowUpRight size={14}/>:<ArrowDownLeft size={14}/>} {typeof edge.label==='string'?edge.label:String(edge.data?.relationship??'relates_to').replace(/_/g,' ')}</div>
     <strong>{neighbor.data.label}</strong>
     {edge.data?.userCreated||edge.data?.manuallyEdited?<span className="connection-evidence">Named by you.</span>:edge.data?.kind==='shared_topic'&&<span className="connection-evidence">Inferred from the topics of both questions.</span>}
     {evidence&&<span className="connection-evidence"><span>{edge.data?.manuallyEdited?'Original excerpt · ':''}{evidence.source==='user'?'Your prompt':'AI answer'}</span> “{evidence.quote}”</span>}
    </button><button className="connection-edit-link" onClick={()=>onEditConnection(edge.id)}><Pencil size={12}/>Edit connection</button></div>;
   }):<p>No connections yet.</p>}</div>
  </section>
 </>;
}

export function NodeInspector({node,nodes,edges,onClose,onSelect,onShowChat,onSave,sessionTitles,onAddConnection,onEditConnection}:InspectorProps){
 const drawer=useRef<HTMLElement>(null);
 const open=Boolean(node);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  drawer.current?.focus();
  return()=>{if(previous?.isConnected)previous.focus();};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
  window.addEventListener('keydown',handler);
  return()=>window.removeEventListener('keydown',handler);
 },[open,onClose]);
 return <aside ref={drawer} tabIndex={-1} role="dialog" aria-modal="false" aria-label="Topic details" aria-hidden={!open} className={`inspector ${open?'open':''}`}>
  {node&&<>
   <div className="inspector-top"><span className="eyebrow">TOPIC DETAILS</span><button className="icon-button" onClick={onClose} aria-label="Close topic details"><X size={18}/></button></div>
   <InspectorContent onAddConnection={onAddConnection} onEditConnection={onEditConnection} sessionTitles={sessionTitles} key={node.id} node={node} nodes={nodes} edges={edges} onSelect={onSelect} onShowChat={onShowChat} onSave={onSave}/>
  </>}
 </aside>;
}
