'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildExecutiveValueStory}=require('../src/shared/executive-value-story');
function source(overrides={}){
 const data={currency:'USD',contractMonths:36,invest:125000,modelVersion:27,users:10,labor:50000,mLabor:.1,threeWhysAct:'Inventory uncertainty creates operating cost.',threeWhysNow:'The customer has a dated operational priority.',threeWhysCi:'Cloud Inventory aligns inventory execution across systems.',revenue:100000000,inventory:10000000,...overrides.data};
 return {scenario:{id:'s1',base_id:'b1',version:2,company:'Acme',industry:'Manufacturing',solution:'cip',owner_username:'rep',data},governance:{evidence:{}},stakeholders:[],discovery:[],solutionFit:null,jointProjectPlan:null,proposal:null,...overrides};
}
test('one story is deterministic and customer safe',()=>{
 const a=buildExecutiveValueStory(source()),b=buildExecutiveValueStory(source());
 assert.equal(a.storyRevision,b.storyRevision);
 assert.equal(a.meta.customer,'Acme');
 assert.equal(a.customerSafety.projection,'customer-safe');
 assert.equal(JSON.stringify(a).includes('deal risk'),false);
 assert.equal(a.threeWhys.whyChange.value,'Inventory uncertainty creates operating cost.');
});
test('story revision changes when governed narrative changes',()=>{
 const a=buildExecutiveValueStory(source()),b=buildExecutiveValueStory(source({data:{threeWhysAct:'A newly confirmed current-state problem.'}}));
 assert.notEqual(a.storyRevision,b.storyRevision);
});
test('solution fit is not invented when absent',()=>{
 const story=buildExecutiveValueStory(source());
 assert.equal(story.solutionAlignment.exists,false);
 assert.deepEqual(story.solutionAlignment.priorityWorkflows,[]);
 assert.equal(story.nextSteps.status,'To validate');
});
test('proposal review and save metadata do not change story identity',()=>{
 const base=source({proposal:{title:'Proposal'}}),a=buildExecutiveValueStory(base);
 const reviewed=source({proposal:{title:'Proposal'},data:{proposalMeta:{storyRevisionReviewed:a.storyRevision,revision:2,reviewedAt:'2026-08-31',reviewedBy:'u1',updatedAt:'2026-08-31'}}});
 const b=buildExecutiveValueStory(reviewed);
 assert.equal(b.storyRevision,a.storyRevision);
 const incremented=buildExecutiveValueStory(source({proposal:{title:'Proposal'},data:{proposalMeta:{storyRevisionReviewed:a.storyRevision,revision:99,reviewedAt:'2026-09-01',reviewedBy:'u2',updatedAt:'2026-09-01'}}}));
 assert.equal(incremented.storyRevision,a.storyRevision);
});
test('ROI, JPP and proof source changes change story identity',()=>{
 const a=buildExecutiveValueStory(source());
 const roi=buildExecutiveValueStory(source({data:{users:20}}));
 const jpp=buildExecutiveValueStory(source({jointProjectPlan:{milestones:[{task:'Validate security',owner:'prospect',dueDate:'2026-09-10',status:'pending'}]}}));
 const proof=buildExecutiveValueStory(source({data:{customerProofSelection:['proof_not_available']}}));
 assert.notEqual(roi.storyRevision,a.storyRevision);
 assert.notEqual(jpp.storyRevision,a.storyRevision);
 assert.notEqual(proof.storyRevision,a.storyRevision);
});
