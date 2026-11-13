import {useCallback,useEffect,useRef,useState} from 'react';
import {Background,Controls,MiniMap,ReactFlow,ReactFlowProvider,useEdgesState,useNodesState,useReactFlow,type Edge} from '@xyflow/react';
import {Download,Network,RotateCcw,Waypoints,Info,Plus,X} from 'lucide-react';
import type {ChatMessage,Concept,WorkspaceSnapshot} from './types';
import {askLLM,hasApiKey,missingKeyMessage} from './services/llm';
import {askMockLLM} from './services/mockLLM';
import {updateConcept,type ConceptEdits} from './lib/nodeEdit';
import {mergeGraph} from './lib/graphMerge';
import {deleteTopic,restoreTopic,type DeletedTopic} from './lib/nodeDelete';
import {addConnection,renameConnection,deleteConnection,type ConnectionDraft} from './lib/connections';
import {ConnectionEditor,type ConnectionEditorRequest} from './components/ConnectionEditor';
import {conversationHistory,createChatSession,findMessageSession,renameSession,setSessionMessages,updateSession} from './lib/sessions';
import {createWorkspace,loadWorkspace,saveWorkspace} from './lib/workspace';
import {ConceptNode} from './components/ConceptNode';
import {ChatPanel} from './components/ChatPanel';
import {NodeInspector} from './components/NodeInspector';
import {SessionSwitcher} from './components/SessionSwitcher';

const nodeTypes={concept:ConceptNode};
const uid=()=>crypto.randomUUID();
function Workspace(){
 const [initial]=useState(loadWorkspace);
 const [sessions,setSessions]=useState(initial.workspace.sessions);
 const [activeSessionId,setActiveSessionId]=useState(initial.workspace.activeSessionId);
 const [mode,setMode]=useState<'demo'|'openai'>(initial.workspace.mode);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [connectionEditor,setConnectionEditor]=useState<ConnectionEditorRequest|null>(null);
 const [deletedConnections,setDeletedConnections]=useState(initial.workspace.deletedConnections??[]);
 const [deletedNodeIds,setDeletedNodeIds]=useState(initial.workspace.deletedNodeIds??[]);
 const [lastDeletedTopic,setLastDeletedTopic]=useState<DeletedTopic|null>(null);
 const [pendingSessionId,setPendingSessionId]=useState<string|null>(null);
 const [messageToShow,setMessageToShow]=useState<string|null>(null);
 const [saveStatus,setSaveStatus]=useState<'saving'|'saved'|'error'>('saved');
 const [storageError,setStorageError]=useState<string|undefined>(initial.error);
 const [nodes,setNodes,onNodesChange]=useNodesState<Concept>(initial.workspace.nodes);
 const [edges,setEdges,onEdgesChange]=useEdgesState<Edge>(initial.workspace.edges);
 const nodeState=useRef(nodes);nodeState.current=nodes;
 const edgeState=useRef(edges);edgeState.current=edges;
 const deletedState=useRef(deletedConnections);deletedState.current=deletedConnections;
 const deletedNodesState=useRef(deletedNodeIds);deletedNodesState.current=deletedNodeIds;
 const flow=useReactFlow<Concept>();
 const busy=useRef(false),request=useRef(0),controller=useRef<AbortController|null>(null);
 const graphPanel=useRef<HTMLElement>(null);
 const active=sessions.find(session=>session.id===activeSessionId)??sessions[0];
 const selected=nodes.find(node=>node.id===selectedId);
 const isDemo=mode==='demo',canSend=isDemo||hasApiKey;
 const loading=pendingSessionId===active.id;
 const otherChatLoading=Boolean(pendingSessionId&&!loading);
 const pendingTitle=sessions.find(session=>session.id===pendingSessionId)?.title;
 const snapshot=useRef<WorkspaceSnapshot>(initial.workspace);
 snapshot.current={version:1,sessions,activeSessionId:active.id,nodes,edges,mode,pendingSessionId,deletedConnections,deletedNodeIds};

 const close=useCallback(()=>{
  setSelectedId(null);setConnectionEditor(null);setEdges(current=>current.map(edge=>edge.selected?{...edge,selected:false}:edge));setNodes(current=>current.map(node=>node.selected?{...node,selected:false}:node));
 },[setNodes,setEdges]);
 const select=useCallback((id:string,focusGraph=true)=>{
  setSelectedId(id);setConnectionEditor(null);setEdges(current=>current.map(edge=>edge.selected?{...edge,selected:false}:edge));setNodes(current=>current.map(node=>({...node,selected:node.id===id})));
  if(focusGraph)void flow.fitView({nodes:[{id}],duration:400,padding:0.7,maxZoom:1.2});
 },[flow,setNodes,setEdges]);
 const fit=useCallback(()=>{
  requestAnimationFrame(()=>requestAnimationFrame(()=>{void flow.fitView({duration:400,padding:0.2,maxZoom:1});}));
 },[flow]);
 useEffect(()=>{
  const element=graphPanel.current;if(!element)return;
  let timer:ReturnType<typeof setTimeout>;
  const observer=new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(flow.getNodes().length)fit();},180);});
  observer.observe(element);return()=>{observer.disconnect();clearTimeout(timer);};
 },[flow,fit]);
 useEffect(()=>{
  if(!nodes.some(node=>node.data.isNew))return;
  const timer=setTimeout(()=>setNodes(current=>current.map(node=>node.data.isNew?{...node,data:{...node.data,isNew:false}}:node)),2000);
  return()=>clearTimeout(timer);
 },[nodes,setNodes]);
 useEffect(()=>()=>{request.current++;controller.current?.abort();busy.current=false;},[]);

 useEffect(()=>{
  setSaveStatus('saving');
  const timer=setTimeout(()=>{
   const saved=saveWorkspace(snapshot.current);setSaveStatus(saved?'saved':'error');
   setStorageError(saved?undefined:'This browser could not save your workspace. Keep this tab open; recent changes may be lost on reload.');
  },350);
  return()=>clearTimeout(timer);
 },[sessions,activeSessionId,nodes,edges,mode,pendingSessionId,deletedConnections,deletedNodeIds]);
 useEffect(()=>{
  const flush=()=>{saveWorkspace(snapshot.current);};
  window.addEventListener('pagehide',flush);
  return()=>{window.removeEventListener('pagehide',flush);flush();};
 },[]);

 function showInChat(messageId:string){
  const session=findMessageSession(sessions,messageId);
  if(!session)return;
  setActiveSessionId(session.id);setMessageToShow(messageId);
 }
 useEffect(()=>{
  if(!messageToShow)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let element:HTMLElement|null=null;
  const frame=requestAnimationFrame(()=>{
   element=document.getElementById(`message-${messageToShow}`);
   element?.scrollIntoView({behavior:'smooth',block:'center'});element?.classList.add('message-highlight');
   timer=setTimeout(()=>{element?.classList.remove('message-highlight');setMessageToShow(null);},2000);
  });
  return()=>{cancelAnimationFrame(frame);if(timer)clearTimeout(timer);element?.classList.remove('message-highlight');};
 },[messageToShow,activeSessionId]);

 async function send(text:string,retry=false){
  if(busy.current||!canSend||!text.trim())return;
  const sessionId=active.id;
  busy.current=true;setPendingSessionId(sessionId);
  const token=++request.current,abort=new AbortController();controller.current=abort;
  const base=active.messages.filter(message=>message.role!=='error');
  const next:ChatMessage[]=retry?base:[...base,{id:uid(),role:'user',content:text.trim().slice(0,4000),createdAt:Date.now()}];
  setSessions(current=>updateSession(setSessionMessages(current,sessionId,next),sessionId,session=>({...session,draft:''})));
  try{
   // Only this chat's messages become conversational context. All chats share graph IDs.
   const history=conversationHistory({...active,messages:next});
   const result=await (isDemo?askMockLLM:askLLM)(history,nodeState.current.map(node=>({
    id:node.id,label:node.data.label,question:node.data.answers?.[0]?.question,focus:node.data.focus,
   })),abort.signal);
   if(token!==request.current)return;
   const id=uid(),userMessage=[...next].reverse().find(message=>message.role==='user');
   const merged=mergeGraph(nodeState.current,edgeState.current,result,id,userMessage?.id,userMessage?.content,sessionId,deletedState.current,deletedNodesState.current);
   nodeState.current=merged.nodes;setNodes(merged.nodes);edgeState.current=merged.edges;setEdges(merged.edges);
   setSessions(current=>setSessionMessages(current,sessionId,[...next,{
    id,role:'assistant',source:mode,content:result.chatResponse,nodeIds:[...new Set(result.nodes.map(node=>node.id))],createdAt:Date.now(),
   }]));
   if(merged.addedNodeIds.length)fit();
  }catch(error){
   if(token!==request.current)return;
   setSessions(current=>setSessionMessages(current,sessionId,[...next,{
    id:uid(),role:'error',content:error instanceof Error?error.message:'Something went wrong. Retry.',createdAt:Date.now(),
   }]));
  }finally{
   if(token===request.current){busy.current=false;setPendingSessionId(null);controller.current=null;}
  }
 }
 function openConnection(request:ConnectionEditorRequest){
  setConnectionEditor({...request,sourceId:request.sourceId??(!request.edgeId?selectedId??undefined:undefined),returnNodeId:selectedId??undefined});setSelectedId(null);
  setNodes(current=>current.map(node=>node.selected?{...node,selected:false}:node));
  setEdges(current=>current.map(edge=>({...edge,selected:edge.id===request.edgeId})));
 }
 function closeConnection(){
  const returnNodeId=connectionEditor?.returnNodeId;
  setConnectionEditor(null);setEdges(current=>current.map(edge=>edge.selected?{...edge,selected:false}:edge));
  if(returnNodeId&&flow.getNodes().some(node=>node.id===returnNodeId))select(returnNodeId,false);
 }
 function saveConnection(draft:ConnectionDraft,edgeId?:string):string|undefined {
  try{
   if(edgeId){
    const next=renameConnection(edgeState.current,edgeId,draft.label);edgeState.current=next;setEdges(next);
   }else{
    const next=addConnection(flow.getNodes(),edgeState.current,deletedState.current,draft);
    edgeState.current=next.edges;deletedState.current=next.deletedConnections;setEdges(next.edges);setDeletedConnections(next.deletedConnections);
   }
   closeConnection();return;
  }catch(error){return error instanceof Error?error.message:'Could not save the connection.';}
 }
 function removeConnection(edgeId:string){
  const next=deleteConnection(edgeState.current,deletedState.current,edgeId);
  edgeState.current=next.edges;deletedState.current=next.deletedConnections;setEdges(next.edges);setDeletedConnections(next.deletedConnections);closeConnection();
 }
 function newChat(){
  const session=createChatSession();setSessions(current=>[...current,session]);setActiveSessionId(session.id);setMessageToShow(null);
 }
 function saveConcept(id:string,edits:ConceptEdits){const next=updateConcept(nodeState.current,id,edits);nodeState.current=next;setNodes(next);}
 function removeTopic(id:string){
  const node=nodeState.current.find(node=>node.id===id);if(!node)return;
  const count=edgeState.current.filter(edge=>edge.source===id||edge.target===id).length;
  if(!window.confirm(`Delete “${node.data.label}” and its ${count} ${count===1?'connection':'connections'}? Chat messages will be kept.`))return;
  const next=deleteTopic(nodeState.current,edgeState.current,deletedNodesState.current,id);
  nodeState.current=next.nodes;edgeState.current=next.edges;deletedNodesState.current=next.deletedNodeIds;
  setNodes(next.nodes);setEdges(next.edges);setDeletedNodeIds(next.deletedNodeIds);setLastDeletedTopic(next.deleted??null);
  setSelectedId(null);setConnectionEditor(null);
 }
 function undoTopicDeletion(){
  if(!lastDeletedTopic)return;
  const next=restoreTopic(nodeState.current,edgeState.current,deletedNodesState.current,deletedState.current,lastDeletedTopic);
  nodeState.current=next.nodes;edgeState.current=next.edges;deletedNodesState.current=next.deletedNodeIds;
  setNodes(next.nodes);setEdges(next.edges);setDeletedNodeIds(next.deletedNodeIds);setLastDeletedTopic(null);
  requestAnimationFrame(()=>{if(nodeState.current.some(node=>node.id===lastDeletedTopic.node.id))select(lastDeletedTopic.node.id);});
 }
 function reset(){
  if(!window.confirm('Reset the workspace? This clears ALL chats and the shared knowledge graph, including saved browser data.'))return;
  request.current++;controller.current?.abort();busy.current=false;setPendingSessionId(null);setSelectedId(null);setMessageToShow(null);
  const fresh=createWorkspace();fresh.mode=mode;
  setSessions(fresh.sessions);setActiveSessionId(fresh.activeSessionId);nodeState.current=[];setNodes([]);deletedNodesState.current=[];setDeletedNodeIds([]);setLastDeletedTopic(null);edgeState.current=[];setEdges([]);deletedState.current=[];setDeletedConnections([]);setConnectionEditor(null);
  snapshot.current=fresh;saveWorkspace(fresh);
 }
 function exportGraph(){
  const url=URL.createObjectURL(new Blob([JSON.stringify({nodes,edges},null,2)],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='cogniverse-graph.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <div className="app-shell">
  <header className="app-header"><div className="brand"><div className="brand-mark"><Waypoints size={23}/></div><span>cogniverse<span className="brand-dot">.</span></span><span className="prototype">LOCAL PREVIEW</span></div>
   <div className="header-actions"><select className="mode-select" aria-label="Response mode" value={mode} disabled={pendingSessionId!==null} onChange={event=>setMode(event.target.value as 'demo'|'openai')}><option value="demo">Demo mode</option><option value="openai">OpenAI API</option></select><span className="local-status"><i/> Local workspace</span><button onClick={reset} aria-label="Reset all chats and graph"><RotateCcw size={15}/><span>Reset all</span></button></div>
  </header>
  {!isDemo&&!hasApiKey&&<div className="error-banner" role="alert"><Info size={16}/><span>{missingKeyMessage}</span></div>}
  {storageError&&<div className="error-banner" role="alert"><Info size={16}/><span>{storageError}</span></div>}
  <main className="workspace">
   <ChatPanel key={active.id} isDemo={isDemo} messages={active.messages} nodes={nodes} loading={loading} disabled={!canSend||otherChatLoading}
    draft={active.draft} onDraftChange={draft=>setSessions(current=>updateSession(current,active.id,session=>({...session,draft})))}
    sessionControls={<SessionSwitcher sessions={sessions} activeSessionId={active.id} pendingSessionId={pendingSessionId} onSelect={id=>{setActiveSessionId(id);setMessageToShow(null);}} onNew={newChat} onRename={(id,title)=>setSessions(current=>renameSession(current,id,title))}/>}
    backgroundStatus={otherChatLoading?`A reply is being prepared in “${pendingTitle}”. You can switch chats while it finishes.`:undefined}
    onSend={text=>void send(text)} onRetry={()=>{const last=[...active.messages].reverse().find(message=>message.role==='user');if(last)void send(last.content,true);}} onSelect={select}/>
   <section ref={graphPanel} className="graph-panel"><div className="panel-heading"><div><Network size={18}/><h2>Shared knowledge graph</h2><span className="count">{nodes.length}</span></div><div className="graph-actions"><button className="add-connection" aria-label="Add connection" title="Add connection" disabled={nodes.length<2} onClick={()=>openConnection({})}><Plus size={14}/><span>Add connection</span></button><button className="icon-button" disabled={!nodes.length} onClick={exportGraph} aria-label="Export graph as JSON" title="Export graph"><Download size={16}/></button></div></div>
    <div className="graph-canvas"><ReactFlow<Concept> nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} onNodeClick={(_,node)=>select(node.id,false)} onEdgeClick={(_,edge)=>openConnection({edgeId:edge.id})} onConnect={connection=>openConnection({sourceId:connection.source,targetId:connection.target})} isValidConnection={connection=>connection.source!==connection.target} onPaneClick={close} nodesConnectable deleteKeyCode={null} minZoom={0.1} maxZoom={2} fitView>
     <Background gap={22} size={1} color="#dce2e6"/><Controls showInteractive={false}/><MiniMap nodeColor="#78a28a" pannable zoomable maskColor="rgba(245,248,249,.7)"/>
    </ReactFlow>
    {!nodes.length&&<div className="graph-empty"><div className="graph-illustration"><span className="orbit o1"/><span className="orbit o2"/><span className="mini-node mn1"/><span className="mini-node mn2"/><span className="mini-node mn3"/><div><Network size={28}/></div></div><h2>Ideas don’t exist in isolation.</h2><p>Your chats contribute to one shared knowledge graph.</p><span>Discover concepts. Follow connections. See the bigger picture.</span></div>}
    <NodeInspector onDelete={removeTopic} onAddConnection={sourceId=>openConnection({sourceId})} onEditConnection={edgeId=>openConnection({edgeId})} onSave={saveConcept} node={selected} nodes={nodes} edges={edges} sessionTitles={Object.fromEntries(sessions.map(session=>[session.id,session.title]))} onClose={close} onSelect={select} onShowChat={showInChat}/>
    {lastDeletedTopic&&<div className="node-deleted-toast" role="status"><span>Deleted “{lastDeletedTopic.node.data.label}” and {lastDeletedTopic.edges.length} {lastDeletedTopic.edges.length===1?'connection':'connections'}.</span><button onClick={undoTopicDeletion}>Undo</button><button className="icon-button" aria-label="Dismiss deleted topic notice" onClick={()=>setLastDeletedTopic(null)}><X size={13}/></button></div>}
    <ConnectionEditor request={connectionEditor} nodes={nodes} edges={edges} onClose={closeConnection} onSave={saveConnection} onDelete={removeConnection} onShowChat={showInChat}/>
    </div><footer className="graph-footer"><span><i/> {edges.length} connections · {sessions.length} {sessions.length===1?'chat':'chats'}</span><span>Drag to explore · Scroll to zoom</span></footer>
   </section>
  </main>
  <footer className="app-footer"><span>CONNECTED IDEAS. CLEARER THINKING.</span><span role="status">{saveStatus==='saved'?'Saved on this browser':saveStatus==='saving'?'Saving…':'Changes not saved'}<span className="footer-dot">·</span> One graph across all chats</span></footer>
 </div>;
}
export default function App(){return <ReactFlowProvider><Workspace/></ReactFlowProvider>;}
