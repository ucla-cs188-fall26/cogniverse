import {afterEach,describe,expect,it,vi} from 'vitest';
import {extractionPrompt,graphResponseFormat,parseAndSanitize} from './extraction';
import {mergeGraph} from '../lib/graphMerge';
import {updateConcept} from '../lib/nodeEdit';

const prompt='How do user interviews help thematic analysis?';
const answer='Thematic analysis uses coding to identify recurring patterns.';
const evidence=(source:'user'|'assistant',quote:string)=>({source,quote});
const node=(id:string,label:string,source:'user'|'assistant',quote:string)=>({id,label,summary:'A short summary.',evidence:evidence(source,quote)});
const base={chatResponse:answer,nodes:[
 node('interviews','Interviews','user','user interviews'),
 node('thematic-analysis','Thematic analysis','assistant','Thematic analysis'),
 node('coding','Coding','assistant','coding'),
],edges:[{source:'thematic-analysis',target:'coding',relationship:'uses',evidence:evidence('assistant','Thematic analysis uses coding to identify recurring patterns.')}]} as const;
const parse=(value:unknown,existing:{id:string;label:string}[]=[],user=prompt)=>parseAndSanitize(JSON.stringify(value),existing,user);

vi.spyOn(console,'warn').mockImplementation(()=>{});
afterEach(()=>vi.clearAllMocks());

describe('grounded extraction',()=>{
 it('accepts concepts only present in the user prompt, plus answer concepts and grounded edges',()=>{
  const result=parse(base);
  expect(result.nodes.map(n=>n.id)).toEqual(['interviews','thematic-analysis','coding']);
  expect(result.nodes[0].evidence).toEqual(evidence('user','user interviews'));
  expect(result.edges).toHaveLength(1);
 });
 it('drops fabricated quotes, wrong sources, and concepts cited only from old messages',()=>{
  const result=parse({...base,nodes:[...base.nodes,
   node('made-up','Made up','assistant','Invented supporting text'),
   node('wrong-source','Wrong source','user','coding'),
   node('older-topic','Older topic','user','qualitative research'),
  ]});
  expect(result.nodes.map(n=>n.id)).toEqual(['interviews','thematic-analysis','coding']);
 });
 it('rejects missing, empty, or overlong evidence without losing the chat reply',()=>{
  const result=parse({chatResponse:'x'.repeat(300),nodes:[
   {id:'a',label:'A'},node('b','B','assistant',''),node('c','C','assistant','x'.repeat(201)),
  ],edges:[]});
  expect(result.chatResponse).toHaveLength(300);expect(result.nodes).toEqual([]);
 });
 it('requires independent evidence for edges and removes edges whose new endpoint was rejected',()=>{
  const result=parse({...base,edges:[...base.edges,
   {source:'interviews',target:'coding',relationship:'uses'},
   {source:'interviews',target:'coding',relationship:'uses',evidence:evidence('assistant','Interviews use coding.')},
   {source:'missing',target:'coding',relationship:'uses',evidence:evidence('assistant','coding')},
  ]});
  expect(result.edges).toEqual(base.edges);
 });
 it('keeps at most six validated concepts in model priority order and removes overflow edges',()=>{
  const nodes=Array.from({length:8},(_,i)=>node(`concept-${i}`,`Concept ${i}`,'assistant',`Concept ${i}`));
  const result=parse({chatResponse:nodes.map(n=>n.label).join(', '),nodes,edges:[
   {source:'concept-0',target:'concept-7',relationship:'relates_to',evidence:evidence('assistant','Concept 7')},
  ]});
  expect(result.nodes.map(n=>n.id)).toEqual(nodes.slice(0,6).map(n=>n.id));expect(result.edges).toEqual([]);
 });
 it('reuses existing labels despite ID or punctuation variation, and rewrites edge endpoints',()=>{
  const result=parse({...base,nodes:[node('another-id','Thematic Analysis!','assistant','Thematic analysis'),base.nodes[2]],edges:[
   {...base.edges[0],source:'another-id'},
  ]},[{id:'themes',label:'Thematic analysis'}]);
  expect(result.nodes[0].id).toBe('themes');expect(result.edges[0].source).toBe('themes');
 });
 it('deduplicates canonical labels and drops self-loops created by normalization',()=>{
  const result=parse({...base,nodes:[node('themes-a','Thematic analysis','assistant','Thematic analysis'),node('themes-b','Thematic Analysis','assistant','Thematic analysis')],edges:[
   {...base.edges[0],source:'themes-a',target:'themes-b'},
  ]},[{id:'themes',label:'Thematic analysis'}]);
  expect(result.nodes).toHaveLength(1);expect(result.edges).toEqual([]);
 });
 it('links evidence to the correct message and preserves original evidence after manual edits',()=>{
  const result=parse(base);
  const graph=mergeGraph([],[],result,'assistant-message','user-message');
  expect(graph.nodes[0].data.firstSeenMessageId).toBe('user-message');
  expect(graph.nodes[0].data.evidence?.messageId).toBe('user-message');
  expect(graph.nodes[1].data.evidence?.messageId).toBe('assistant-message');
  expect(graph.edges[0].data?.evidence).toMatchObject({messageId:'assistant-message',source:'assistant'});
  const changed=updateConcept(graph.nodes,'interviews',{label:'Edited interviews',summary:'Edited',quote:'My revised context'});
  expect(changed[0].data.quote).toBe('My revised context');
  expect(changed[0].data.evidence).toEqual({...evidence('user','user interviews'),messageId:'user-message'});
 });
 it('allows small talk to have no graph elements and validates the strict schema recursively',()=>{
  expect(parse({chatResponse:'Hello!',nodes:[],edges:[]})).toEqual({chatResponse:'Hello!',nodes:[],edges:[]});
  function check(schema:Record<string,unknown>){
   if(schema.type==='object'){
    expect(schema.additionalProperties).toBe(false);
    const properties=schema.properties as Record<string,Record<string,unknown>>;
    expect([...(schema.required as string[])].sort()).toEqual(Object.keys(properties).sort());Object.values(properties).forEach(check);
   }
   if(schema.type==='array')check(schema.items as Record<string,unknown>);
   if(Array.isArray(schema.anyOf))schema.anyOf.forEach(branch=>check(branch as Record<string,unknown>));
  }
  expect(graphResponseFormat.json_schema.strict).toBe(true);check(graphResponseFormat.json_schema.schema);
  expect(extractionPrompt).toContain('Never fill a quota');
 });
});
