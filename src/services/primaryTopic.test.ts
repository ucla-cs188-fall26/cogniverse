import {describe,expect,it} from 'vitest';
import {graphResponseFormat,parseAndSanitize} from './extraction';
import {mergeGraph} from '../lib/graphMerge';
import {updateConcept} from '../lib/nodeEdit';
import {topicDemoScenarios} from './topicDemos';

const question='how to make a burger';
const answer=topicDemoScenarios[0].result.chatResponse;
const parse=(value:unknown,prompt=question,existing:{id:string;label:string}[]=[])=>parseAndSanitize(JSON.stringify(value),existing,prompt,true);
const response={chatResponse:answer,primaryTopic:{id:'make-a-burger',label:'Make a burger',summary:'A complete recipe.'},nodes:[],edges:[]};

describe('answer-carrying main topics',()=>{
 it('creates a burger node even with no keyword extraction and stores the complete recipe',()=>{
  const result=parse(response);
  expect(result.nodes).toHaveLength(1);expect(result.primaryTopicId).toBe('make-a-burger');
  const graph=mergeGraph([],[],result,'answer-1','question-1',question);
  expect(graph.nodes[0].data.answers?.[0]).toEqual({messageId:'answer-1',questionMessageId:'question-1',question,answer});
  expect(graph.nodes[0].data.answers?.[0].answer.length).toBeGreaterThan(400);
  expect(graph.nodes[0].data.answers?.[0].answer).toContain('Ingredients');
  expect(graph.nodes[0].data.answers?.[0].answer).toContain('Steps');
 });
 it.each([{}, {primaryTopic:null},{primaryTopic:{id:'',label:' ',summary:''}}])('falls back to the question when primary extraction is missing or unusable: %j',partial=>{
  const result=parse({chatResponse:answer,nodes:[],edges:[],...partial});
  expect(result.primaryTopicId).toBe('make-a-burger');expect(result.nodes[0].label).toBe('Make a burger');
  expect(result.nodes[0].evidence).toEqual({source:'user',quote:question});
 });
 it('retains the primary topic when supporting nodes and edges have invented quotes',()=>{
  const result=parse({...response,nodes:[{id:'salt',label:'Salt',evidence:{source:'assistant',quote:'not in the answer'}}],edges:[{source:'salt',target:'make-a-burger',relationship:'ingredient_in',evidence:{source:'assistant',quote:'also invented'}}]});
  expect(result.nodes.map(n=>n.id)).toEqual(['make-a-burger']);expect(result.edges).toEqual([]);
 });
 it.each(['Thanks!','Hello','Okay.','Thank you very much'])('does not invent a topic for pure small talk: %s',prompt=>{
  expect(parse({chatResponse:'You are welcome!',primaryTopic:null,nodes:[],edges:[]},prompt).nodes).toEqual([]);
 });
 it('treats a question after thanks as substantive',()=>{
  expect(parse({chatResponse:answer,nodes:[],edges:[]},'Thanks! How do I make a burger?').nodes).toHaveLength(1);
 });
 it('appends follow-up answers while preserving edited content, provenance, and dragged positions',()=>{
  const first=mergeGraph([],[],parse(response),'a1','q1',question);
  first.nodes[0].position={x:800,y:900};first.nodes[0].selected=true;
  const edited=updateConcept(first.nodes,'make-a-burger',{label:'My burger recipe',summary:'My notes',quote:'My context',details:'Use my preferred bun.'});
  const before=structuredClone(edited);
  const followup=parse({...response,chatResponse:'Toast the buns just before serving.'},'When should I toast the buns?',[{id:'make-a-burger',label:'My burger recipe'}]);
  const merged=mergeGraph(edited,first.edges,followup,'a2','q2','When should I toast the buns?');
  expect(edited).toEqual(before);expect(merged.nodes).toHaveLength(1);expect(merged.addedNodeIds).toEqual([]);
  expect(merged.nodes[0]).toMatchObject({position:{x:800,y:900},selected:true,data:{label:'My burger recipe',details:'Use my preferred bun.',summary:'My notes'}});
  expect(merged.nodes[0].data.answers?.map(a=>a.messageId)).toEqual(['a1','a2']);
  expect(merged.nodes[0].data.evidence).toEqual(first.nodes[0].data.evidence);
  const again=mergeGraph(merged.nodes,merged.edges,followup,'a2','q2');
  expect(again.nodes[0].data.answers).toHaveLength(2);
 });
 it('stores linked recipes in their own nodes without splitting ingredients into nodes',()=>{
  const burger=mergeGraph([],[],topicDemoScenarios[0].result,'burger-answer','burger-question',topicDemoScenarios[0].question);
  const onions=mergeGraph(burger.nodes,burger.edges,topicDemoScenarios.find(sample=>sample.id==='onions')!.result,'onion-answer','onion-question',topicDemoScenarios.find(sample=>sample.id==='onions')!.question);
  expect(onions.nodes).toHaveLength(2);expect(onions.edges[0].label).toBe('optional topping for');
  expect(onions.nodes.find(n=>n.id==='make-a-burger')?.data.answers?.[0].answer).toContain('300 g ground beef');
  expect(onions.nodes.find(n=>n.id==='caramelize-onions')?.data.answers?.[0].answer).toContain('2 medium onions');
 });
 it('can create a fallback ID for a non-Latin question',()=>{
  const result=parse({chatResponse:answer,nodes:[],edges:[]},'🍔');
  expect(result.nodes[0].id).toMatch(/^topic-/);expect(result.nodes[0].label).toBe('🍔');
 });
 it('requires the primary topic in the API schema without asking the model to repeat the full answer',()=>{
  const schema=graphResponseFormat.json_schema.schema;
  expect(schema.required).toContain('primaryTopic');
  expect(schema.properties.primaryTopic.anyOf[0].required).toEqual(['id','label','summary','focus']);
 });
});
