import {type Concept,type ConceptNodeData} from '../types';

export type ConceptEdits = Pick<ConceptNodeData,'label'|'summary'|'quote'|'details'>;

export function updateConcept(nodes:Concept[],id:string,edits:ConceptEdits):Concept[] {
 const label=edits.label.trim();
 if(!label) throw new Error('Give this topic a name.');
 return nodes.map(node=>node.id===id?{
  ...node,
  // IDs, provenance, positions, and selection stay stable so all existing links work.
  data:{...node.data,label,summary:edits.summary.trim(),quote:edits.quote.trim(),...(edits.details!==undefined?{details:edits.details.trim()}:{})},
 }:node);
}
