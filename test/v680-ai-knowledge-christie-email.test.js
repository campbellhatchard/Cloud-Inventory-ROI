'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const knowledge=require('../src/shared/application-knowledge'),christie=require('../src/shared/christie-context');

test('release locks application, ROI, brand, knowledge and persona versions',()=>{
 assert.equal(require('../package.json').version,'6.8.5');assert.equal(knowledge.knowledge.applicationVersion,'6.8.5');
 assert.equal(knowledge.knowledge.roiModel.version,'2.8');assert.equal(knowledge.knowledge.roiModel.modelVersion,28);assert.equal(knowledge.knowledge.brandVersion,'1.0');
 assert.equal(knowledge.knowledge.knowledgeVersion,'1.0');assert.equal(christie.persona.personaVersion,'1.0');
});
test('application knowledge reuses governed field registry and covers major workspaces',()=>{
 const field=knowledge.fieldKnowledge('revenue','Revenue');assert.ok(field);assert.ok(field.classification);assert.ok(field.formula);
 for(const id of ['roi','discovery','readiness','stakeholders','solution-fit','jpp','outputs','coach','sensitivity','impact','compare','saved','manager','analytics','customers','admin','guided'])assert.ok(knowledge.knowledge.workspaces.some(x=>x[0]===id),id);
 assert.match(knowledge.systemPrompt({workspaceId:'roi',fieldId:'revenue',role:'rep'}),/Never change governed data|Never change/i);
});
test('browser AI Help contains no embedded giant knowledge base and uses dedicated endpoint',()=>{
 const js=read('public/assistant.js');assert.match(js,/\/api\/ai-help/);assert.doesNotMatch(js,/var KB\s*=\s*\[/);assert.doesNotMatch(js,/SENDGRID_API_KEY/);
 assert.match(read('server.js'),/applicationKnowledge\.systemPrompt/);
});
test('Prospect Help is token and exact-question authoritative',()=>{
 const server=read('server.js'),client=read('public/prospect-assistant.js');
 assert.match(server,/discovery_session_questions/);assert.match(server,/questionId/);assert.match(server,/safeField/);assert.doesNotMatch(client,/fieldContext:ctx/);
 assert.match(client,/questionId:id/);assert.match(server,/Do not expose sales strategy/);
});
test('Christie context revision is deterministic and changes with material facts',()=>{
 const fixture={scenario:{id:'s1',base_id:'b1',version:2,company:'Acme',data:{currency:'USD'}},economics:{annualBenefit:100,totalContractBenefit:300,totalContractInvestment:100,totalContractNetBenefit:200,totalContractRoi:200,totalContractNpv:180,contractPayback:12,driverLedger:[]},roiMaturity:{label:'Customer Validated',customerSupportedValuePct:80},stakeholders:[{name:'A',role:'Economic Buyer'}]};
 const a=christie.buildChristieContext(fixture),b=christie.buildChristieContext(fixture);assert.equal(a.christieContextRevision,b.christieContextRevision);assert.equal(a.economics.contractRoi,200);assert.equal(a.opportunity.opportunityValueMeaning.toLowerCase().includes('not buyer evidence'),true);
 const c=christie.buildChristieContext({...fixture,stakeholders:[]});assert.notEqual(a.christieContextRevision,c.christieContextRevision);
});
test('Christie preferences affect tone only and Coach Me remains no-write',()=>{
 const c=christie.buildChristieContext({scenario:{id:'s',data:{}},economics:{},roiMaturity:{},stakeholders:[]});
 const supportive=christie.deterministicCoach(c,{challenge:'supportive',depth:'quick',perspective:'rep'}),challenging=christie.deterministicCoach(c,{challenge:'challenging',depth:'detailed',perspective:'rep'});
 assert.notEqual(supportive.priority,challenging.priority);assert.equal(supportive.customerCommitmentSought,challenging.customerCommitmentSought);assert.ok(c.noWrite.includes('ROI'));assert.ok(c.noWrite.includes('Proposal'));
 const server=read('server.js');assert.match(server,/\/api\/scenarios\/:id\/christie-context/);assert.match(server,/scenarioAccess\(req\.user,scenarioId,'view'\)/);assert.match(server,/user_ai_preferences/);
});
test('Christie browser delegates prompt and facts to server',()=>{
 const js=read('public/deal-coach.js');assert.match(js,/\/christie'/);assert.match(js,/Coach Me/);assert.match(js,/christieDepth/);assert.doesNotMatch(js,/You are Christie,/);assert.doesNotMatch(js,/STAGE AUTHORITY:/);
});
test('SendGrid requires both variables, has no default sender and does not log bodies',()=>{
 const email=read('src/email.js');assert.match(email,/SENDGRID_API_KEY && FROM_EMAIL/);assert.doesNotMatch(email,/noreply@cloudinventory\.com/);assert.doesNotMatch(email,/Body:\\n/);assert.match(email,/state: 'not_configured'/);assert.match(email,/providerMessageId/);
 const config=read('src/config.js');assert.match(config,/NODE_ENV === 'production'/);assert.match(config,/localhost\|127/);
});
test('customer-facing assumption wording names Cloud Inventory model assumptions',()=>{
 for(const file of ['public/app.js','public/business-case.html'])assert.match(read(file),/documented Cloud Inventory model assumptions/);
});
