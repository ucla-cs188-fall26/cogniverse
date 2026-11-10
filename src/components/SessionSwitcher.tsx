import {useEffect,useRef,useState} from 'react';
import {Check,MessageSquarePlus,Pencil,X} from 'lucide-react';
import type {ChatSession} from '../types';

type Props={sessions:ChatSession[];activeSessionId:string;pendingSessionId:string|null;onSelect:(id:string)=>void;onNew:()=>void;onRename:(id:string,title:string)=>void};
export function SessionSwitcher({sessions,activeSessionId,pendingSessionId,onSelect,onNew,onRename}:Props){
 const [editing,setEditing]=useState(false),[title,setTitle]=useState('');
 const input=useRef<HTMLInputElement>(null);
 const active=sessions.find(session=>session.id===activeSessionId)!;
 useEffect(()=>{setEditing(false);},[activeSessionId]);
 useEffect(()=>{if(editing){input.current?.focus();input.current?.select();}},[editing]);
 return <div className="session-switcher">
  {editing?<form onSubmit={event=>{event.preventDefault();if(title.trim()){onRename(active.id,title);setEditing(false);}}}>
   <input ref={input} aria-label="Chat name" maxLength={80} value={title} onChange={event=>setTitle(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setEditing(false);}}}/>
   <button type="submit" className="icon-button" aria-label="Save chat name" disabled={!title.trim()}><Check size={15}/></button>
   <button type="button" className="icon-button" aria-label="Cancel rename" onClick={()=>setEditing(false)}><X size={15}/></button>
  </form>:<>
   <div className="session-select"><label htmlFor="chat-session">CHAT</label><select id="chat-session" aria-label="Chat session" value={activeSessionId} onChange={event=>onSelect(event.target.value)}>
    {sessions.map(session=><option key={session.id} value={session.id}>{session.title}{pendingSessionId===session.id?' · responding…':''}</option>)}
   </select></div>
   <button className="icon-button" aria-label="Rename current chat" title="Rename chat" onClick={()=>{setTitle(active.title);setEditing(true);}}><Pencil size={14}/></button>
  </>}
  <button className="new-chat" onClick={onNew}><MessageSquarePlus size={15}/><span>New chat</span></button>
 </div>;
}
