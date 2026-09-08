'use strict';
const {flattenQuestionnaire}=require('./questionnaire-definitions');
async function ensureSessionQuestions(client,session,{legacy=false}={}){
 const existing=await client.query(`SELECT question_id,question_text,section,input_type,classification,canonical_input,unit,conversion,placeholder,display_order FROM discovery_session_questions WHERE discovery_session_id=$1 ORDER BY display_order`,[session.id]);
 if(existing.rows.length)return existing.rows;
 const definitions=flattenQuestionnaire(session.industry||'default',{hasFieldInventory:!!session.has_field_inventory});
 for(const q of definitions)await client.query(`INSERT INTO discovery_session_questions(discovery_session_id,question_id,question_text,section,input_type,classification,canonical_input,unit,conversion,placeholder,display_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(discovery_session_id,question_id) DO NOTHING`,[session.id,q.id,q.text,q.section,q.type,q.classification,q.canonicalInput,q.unit,q.conversion,q.placeholder,q.displayOrder]);
 if(legacy)await client.query(`UPDATE discovery_sessions SET questionnaire_schema_source='legacy_backfill' WHERE id=$1`,[session.id]);
 return (await client.query(`SELECT question_id,question_text,section,input_type,classification,canonical_input,unit,conversion,placeholder,display_order FROM discovery_session_questions WHERE discovery_session_id=$1 ORDER BY display_order`,[session.id])).rows;
}
/* Public projection deliberately omits financial classification and canonical
   ROI mappings. Prospect browsers receive only what is needed to render and
   answer the governed question; the server retains what the answer means. */
function groupSessionQuestions(rows=[]){const groups=[];for(const q of rows){let g=groups.at(-1);if(!g||g.section!==q.section){g={section:q.section,questions:[]};groups.push(g);}g.questions.push({id:q.question_id,text:q.question_text,section:q.section,type:q.input_type,unit:q.unit,placeholder:q.placeholder,displayOrder:q.display_order});}return groups;}
module.exports={ensureSessionQuestions,groupSessionQuestions};
