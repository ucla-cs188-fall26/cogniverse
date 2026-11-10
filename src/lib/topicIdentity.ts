import {slugify} from './slug';

// Recognize self-contained requests for a named thing. Pronoun-based elaborations
// ("How long should I cook it?") are deliberately left to conversation context.
export function namedRequestFocus(question:string):string|undefined {
 const text=question.trim().replace(/^(?:please\s+)?(?:can|could|would) you\s+/i,'')
  .replace(/^(?:please\s+)?(?:how (?:do i|can i|to)|help me(?: to)?)\s+/i,'');
 const match=text.match(/^(?:(?:make|cook|prepare|bake|grill|build|create|write|implement|explain|describe|learn|understand)\s+|(?:tell me about|what is|what are|how does|how do)\s+)(.+?)[?!.]*$/i);
 if(!match)return;
 const focus=match[1].replace(/^(?:a|an|the|some)\s+/i,'').replace(/[?!.]+$/,'').trim();
 if(/^(?:it|this|that|them|these|those)\b/i.test(focus))return;
 return focus||undefined;
}

const generic=new Set('a an the my your our me i we you to how do does can make making cook cooking prepare preparing bake baking build create write implement explain understand learn about is are in on for of with and recipe recipes guide tutorial work works use using'.split(' '));
const words=(value:string)=>slugify(value).split('-').filter(word=>word&&!generic.has(word)).map(word=>word.endsWith('s')&&!word.endsWith('ss')&&word.length>3?word.slice(0,-1):word);

export function requestMatchesTopic(focus:string,topic:{id:string;label?:string;question?:string;focus?:string}):boolean {
 // Remove incidental qualifiers after the requested object where possible.
 const subject=focus.split(/\s+(?:with|without|for|using)\s+/i)[0];
 const requested=words(subject);
 if(!requested.length)return true;
 const known=new Set(words([topic.label,topic.focus,topic.question,topic.id].filter(Boolean).join(' ')));
 return requested.every(word=>known.has(word));
}
