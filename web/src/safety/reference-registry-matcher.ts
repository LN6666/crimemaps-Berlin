import type {Observation,ReferenceMetric,Scope,Text} from './reference-fallback';
export interface SourceRule{city:string;scope:Scope;conceptId:string;title:Text;equals:Record<string,unknown>;requiredAbsent:string[];scopeId?:string|null;levels:string[];sourceEvidence:unknown;visibleLimitation?:Text;limitation?:Text;requireVisibleLimitation?:boolean;requiresVisibleLimitation?:boolean;}
export interface SourceContext{city:string;scope:Scope;scopeId:string;scopeName:Text;level?:string;nativeAreaId?:string;}
function field(value:unknown,key:string):unknown{
 let current:any=value;
 for(const part of key.split('.')){if(!current||typeof current!=='object'||!Object.hasOwn(current,part)||['__proto__','constructor','prototype'].includes(part))return undefined;current=current[part];}
 return current;
}
function validatedLimitation(rule:SourceRule):Text|undefined|false {
 const valid=(v:unknown):v is Text=>!!v&&typeof v==='object'&&!Array.isArray(v)&&['zh','en','de'].every(k=>typeof (v as Text)[k as keyof Text]==='string'&&(v as Text)[k as keyof Text].trim().length>0&&(v as Text)[k as keyof Text].length<5000);
 for(const flag of [rule.requireVisibleLimitation,rule.requiresVisibleLimitation])if(flag!==undefined&&typeof flag!=='boolean')return false;
 const limited=rule.sourceEvidence&&typeof rule.sourceEvidence==='object'&&(rule.sourceEvidence as {qualification?:unknown}).qualification==='limited';
 const required=rule.requireVisibleLimitation===true||rule.requiresVisibleLimitation===true||limited;
 if(rule.visibleLimitation!==undefined&&!valid(rule.visibleLimitation)||rule.limitation!==undefined&&!valid(rule.limitation))return false;
 if(rule.visibleLimitation&&rule.limitation&&['zh','en','de'].some(k=>rule.visibleLimitation![k as keyof Text]!==rule.limitation![k as keyof Text]))return false;
 const value=rule.visibleLimitation??rule.limitation;
 return required&&!value?false:value;
}
export function matchesSourceRule(rule:SourceRule,context:SourceContext,metric:ReferenceMetric):boolean{
 if(validatedLimitation(rule)===false)return false;
 if(rule.city!==context.city||rule.scope!==context.scope||!rule.conceptId||!rule.sourceEvidence)return false;
 if(rule.scopeId&&rule.scopeId!==context.scopeId)return false;
 if(rule.levels.length&&(!context.level||!rule.levels.includes(context.level)))return false;
 return Object.entries(rule.equals).every(([key,value])=>field(metric,key)===value)&&rule.requiredAbsent.every(key=>field(metric,key)===undefined||field(metric,key)===null);
}
/** Multiple semantic assignments fail closed, rather than duplicate one observation. */
export function referenceObservation(context:SourceContext,metric:ReferenceMetric,rules:readonly SourceRule[]):Observation|undefined{
 const matching=rules.filter(rule=>matchesSourceRule(rule,context,metric));
 if(matching.length!==1)return undefined;
 const rule=matching[0];
 return {conceptId:rule.conceptId,city:context.city,scope:context.scope,scopeId:context.scopeId,scopeName:context.scopeName,metric,sourceEvidence:JSON.stringify(rule.sourceEvidence),...(validatedLimitation(rule)?{sourceQualifiedLimitation:validatedLimitation(rule) as Text}:{}),sourceNativeLevel:context.scope==='local'?context.level:undefined,nativeAreaId:context.scope==='local'?context.nativeAreaId:undefined};
}
