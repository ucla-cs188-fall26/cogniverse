import type {ChatMessage,ChatSession} from '../types';

export function createChatSession():ChatSession {
 return {id:crypto.randomUUID(),title:'New chat',createdAt:Date.now(),messages:[],draft:''};
}

export function updateSession(sessions:ChatSession[],id:string,update:(session:ChatSession)=>ChatSession):ChatSession[] {
 return sessions.map(session=>session.id===id?update(session):session);
}

export function setSessionMessages(sessions:ChatSession[],id:string,messages:ChatMessage[]):ChatSession[] {
 return updateSession(sessions,id,session=>{
  const firstQuestion=messages.find(message=>message.role==='user')?.content;
  const title=!session.customTitle&&firstQuestion?firstQuestion.replace(/\s+/g,' ').trim().slice(0,70):session.title;
  return {...session,title,messages};
 });
}

export function renameSession(sessions:ChatSession[],id:string,title:string):ChatSession[] {
 const trimmed=title.trim().slice(0,80);
 return trimmed?updateSession(sessions,id,session=>({...session,title:trimmed,customTitle:true})):sessions;
}

export function conversationHistory(session:ChatSession):{role:'user'|'assistant';content:string}[] {
 return session.messages.filter((message):message is ChatMessage&{role:'user'|'assistant'}=>message.role!=='error')
  .map(({role,content})=>({role,content}));
}

export function findMessageSession(sessions:ChatSession[],messageId:string):ChatSession|undefined {
 return sessions.find(session=>session.messages.some(message=>message.id===messageId));
}
