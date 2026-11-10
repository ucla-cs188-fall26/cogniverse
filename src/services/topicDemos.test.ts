import {describe,expect,it} from 'vitest';
import {topicDemoScenarios} from './topicDemos';
import {getMockResult} from './mockLLM';
import {extractionPrompt,graphResponseFormat,parseAndSanitize} from './extraction';
import {mergeGraph} from '../lib/graphMerge';
import type {Concept} from '../types';
import type {Edge} from '@xyflow/react';

describe('topics across domains',()=>{
 it.each(topicDemoScenarios)('accepts $title without classifying its topics',sample=>{
  const result=parseAndSanitize(JSON.stringify(sample.result),[],sample.question);
  expect(result).toEqual(sample.result);
  expect(result.nodes[0].evidence?.source).toBe('user');
  expect(result.nodes.every(node=>!('category' in node))).toBe(true);
  expect(getMockResult(sample.question)).toEqual(result);
 });
 it('reuses cooking topics and grows the same graph when the conversation switches domains',()=>{
  let nodes:Concept[]=[],edges:Edge[]=[];
  const counts=[[1,0],[2,1],[3,2],[4,2],[5,2]];
  topicDemoScenarios.forEach((sample,index)=>{
   const result=mergeGraph(nodes,edges,getMockResult(sample.question,nodes.map(node=>({id:node.id,label:node.data.label}))),`answer-${index}`,`question-${index}`);
   nodes=result.nodes;edges=result.edges;
   expect([nodes.length,edges.length]).toEqual(counts[index]);
   expect(nodes.every(node=>!('category' in node.data))).toBe(true);
  });
  const repeated=mergeGraph(nodes,edges,topicDemoScenarios[0].result,'repeat');
  expect(repeated.addedNodeIds).toEqual([]);expect(repeated.edges).toHaveLength(2);
 });
 it('allows meaningful domain-specific relationships and normalizes their labels',()=>{
  const sample=topicDemoScenarios.find(sample=>sample.id==='onions')!;
  const input={...sample.result,edges:[
   {...sample.result.edges[0],relationship:'Optional Topping For'},
   {...sample.result.edges[0],relationship:'optional_topping_for'},
  ]};
  const result=parseAndSanitize(JSON.stringify(input),[],sample.question);
  expect(result.edges).toHaveLength(1);expect(result.edges[0].relationship).toBe('optional_topping_for');
  const schema=graphResponseFormat.json_schema.schema;
  expect(schema.properties.nodes.items.required).not.toContain('category');
  expect(schema.properties.edges.items.properties.relationship).not.toHaveProperty('enum');
  expect(extractionPrompt).toContain('Every substantive question');
 });
});
