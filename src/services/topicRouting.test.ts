import {describe,expect,it} from 'vitest';
import {parseAndSanitize} from './extraction';
import {mergeGraph} from '../lib/graphMerge';
import {topicFixtures} from '../test/fixtures/topics';
import {getFixtureResult} from '../test/fixtures/conversations';

const burger=topicFixtures[0];
const existing=[{id:'make-a-burger',label:'Make a burger',question:'How to make a burger',focus:'burger'}];
const spaghetti={
 chatResponse:'Spaghetti recipe\nIngredients: spaghetti, tomatoes, olive oil.\nCook the pasta and toss with tomato sauce.',
 // Simulate exactly the reported model mistake, including an incorrect label.
 primaryTopic:{id:'make-a-burger',label:'Make a burger',summary:'A spaghetti recipe.',focus:'spaghetti'},
 nodes:[],edges:[],topicLinks:[{target:'make-a-burger',topic:'cooking'}],
};
const parse=(value:unknown,prompt='how do i make spaghetti',topics=existing)=>parseAndSanitize(JSON.stringify(value),topics,prompt,true);

describe('separate subjects and shared topics',()=>{
 it('routes spaghetti to its own answer container even when the model reuses the burger ID and label',()=>{
  const result=parse(spaghetti);
  expect(result.primaryTopicId).toBe('make-spaghetti');
  expect(result.nodes[0].label).toBe('Make spaghetti');
  expect(result.edges).toEqual([{source:'make-spaghetti',target:'make-a-burger',relationship:'cooking',kind:'shared_topic'}]);
  const first=mergeGraph([],[],burger.result,'burger-answer','burger-question',burger.question);
  const before=structuredClone(first.nodes);
  const merged=mergeGraph(first.nodes,first.edges,result,'spaghetti-answer','spaghetti-question','how do i make spaghetti');
  expect(first.nodes).toEqual(before);expect(merged.nodes).toHaveLength(2);
  expect(merged.nodes.find(n=>n.id==='make-a-burger')?.data.answers).toHaveLength(1);
  expect(merged.nodes.find(n=>n.id==='make-a-burger')?.data.answers?.[0].answer).toBe(burger.result.chatResponse);
  expect(merged.nodes.find(n=>n.id==='make-spaghetti')?.data.answers?.[0].answer).toBe(spaghetti.chatResponse);
  expect(merged.edges[0]).toMatchObject({label:'cooking',data:{kind:'shared_topic'}});
  expect(merged.edges[0].markerEnd).toBeUndefined();
 });
 it.each(['burger','make',''])('does not trust an ungrounded or generic focus to hide a subject change: %s',focus=>{
  expect(parse({...spaghetti,primaryTopic:{...spaghetti.primaryTopic,focus}}).primaryTopicId).toBe('make-spaghetti');
 });
 it('preserves contextual follow-ups and genuine paraphrases about the original subject',()=>{
  for(const question of ['How long should I cook it?','When should I toast the buns?','How do I make burgers?']){
   const result=parse({...spaghetti,primaryTopic:{...spaghetti.primaryTopic,focus:''},topicLinks:[]},question);
   expect(result.primaryTopicId).toBe('make-a-burger');
  }
 });
 it('uses original questions to recognize an existing topic after the user renames its label',()=>{
  const topics=[{...existing[0],label:'My favorite recipe'}];
  expect(parse({...spaghetti,primaryTopic:{...spaghetti.primaryTopic,focus:'burger'},topicLinks:[]},'How do I make a burger?',topics).primaryTopicId).toBe('make-a-burger');
 });
 it('also separates new subjects within the same programming language',()=>{
  const result= parseAndSanitize(JSON.stringify({
   chatResponse:'Dictionaries store key-value pairs.',primaryTopic:{id:'python-lists',label:'Python lists',summary:'Dictionaries',focus:'Python dictionaries'},nodes:[],edges:[],topicLinks:[{target:'python-lists',topic:'programming'}],
  }),[{id:'python-lists',label:'Python lists',question:'Explain Python lists'}],'Explain Python dictionaries',true);
  expect(result.primaryTopicId).toBe('explain-python-dictionaries');expect(result.edges[0].relationship).toBe('programming');
 });
 it('drops self-links, unknown targets, empty themes, and duplicate inferred links',()=>{
  const result=parse({...spaghetti,topicLinks:[
   {target:'make-spaghetti',topic:'cooking'}, {target:'missing',topic:'cooking'},
   {target:'make-a-burger',topic:' '},...spaghetti.topicLinks,...spaghetti.topicLinks,
  ]});expect(result.edges).toHaveLength(1);
 });
 it('keeps specific grounded relationships rather than adding a redundant shared theme',()=>{
  const result=parse({
   chatResponse:'Caramelized onions are an optional topping for a burger.',
   primaryTopic:{id:'caramelize-onions',label:'Caramelize onions',focus:'onions',summary:'An onion topping.'},nodes:[],
   edges:[{source:'caramelize-onions',target:'make-a-burger',relationship:'optional_topping_for',evidence:{source:'assistant',quote:'Caramelized onions are an optional topping for a burger.'}}],topicLinks:[{target:'make-a-burger',topic:'cooking'}],
  },'How do I caramelize onions for my burger?');
  expect(result.edges).toHaveLength(1);expect(result.edges[0].relationship).toBe('optional_topping_for');
 });
 it('does not duplicate an undirected shared-topic link when its direction is reversed',()=>{
  const result=parse(spaghetti);
  const first=mergeGraph([],[],burger.result,'a1','q1',burger.question);
  const second=mergeGraph(first.nodes,first.edges,result,'a2','q2','how do i make spaghetti');
  const third=mergeGraph(second.nodes,second.edges,{...burger.result,edges:[{source:'make-a-burger',target:'make-spaghetti',relationship:'cooking',kind:'shared_topic'}]},'a3','q3','How to make a burger');
  expect(third.edges).toHaveLength(1);
 });
 it('reproduces the requested burger → spaghetti behavior using conversation fixtures',()=>{
  const result=getFixtureResult('how do i make spaghetti',existing);
  expect(result.primaryTopicId).toBe('make-spaghetti');expect(result.edges[0]).toMatchObject({relationship:'cooking',kind:'shared_topic'});
  const parsed=parseAndSanitize(JSON.stringify(result),existing,'how do i make spaghetti');
  expect(parsed).toEqual(result);
 });
});
