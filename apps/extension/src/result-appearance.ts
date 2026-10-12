import { ComplianceEvaluation, ComplianceStatus, SourceName } from '@katilim/shared-types';

// Presentation does not change a source result into a religious verdict.
export function resultAppearance(result: ComplianceEvaluation) {
 if(result.status===ComplianceStatus.COMPLIANT) return {variant:'success',icon:'✅'} as const;
 if(result.status===ComplianceStatus.NON_COMPLIANT) return {variant:'danger',icon:'❌'} as const;
 if(result.status===ComplianceStatus.UNCERTAIN) {
  const membership=result.indices.find(index=>index.indexCode==='XKTUM');
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const checkedDay=result.asOf&&Number.isFinite(Date.parse(result.asOf))?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(result.asOf)):'';
  const official=result.sources.some(source=>source.sourceName===SourceName.BIST && source.url==='https://borsaistanbul.com/datum/hisse_endeks_katilim_ds.csv');
  const date=membership?.period;
  if(official&&membership?.isMember&&date&&checkedDay&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=today&&date<=checkedDay&&Date.parse(today)-Date.parse(date)<=7*86400000) return {variant:'success',icon:'✅'} as const;
 }
 return {variant:'warning',icon:'⚠️'} as const;
}
