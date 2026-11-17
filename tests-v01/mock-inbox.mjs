import {queryInbox} from '../backend/inbox.mjs';
export async function mockInbox(page,state){
 await page.route('**/api/state?view=summary',route=>route.fulfill({json:state}));
 const rows=state.raw.filter(row=>!row.topic_count);
 const store={
  settings:()=>state.settings,
  sourceList:()=>state.sources,
  refreshScreening:()=>{},
  q:()=>rows.map(row=>({...row,tags:JSON.stringify(row.tags),metrics:JSON.stringify(row.metrics)})),
  rawOne:id=>rows.find(row=>row.id===id),
 };
 await page.route('**/api/inbox?*',route=>route.fulfill({json:queryInbox(store,new URL(route.request().url()).searchParams)}));
}
