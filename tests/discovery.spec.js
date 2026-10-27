import {test,expect} from '@playwright/test';
function payload(failed=false){const now=new Date().toISOString();return {fetchedAt:now,sources:[{sourceId:'douyin',sourceName:'抖音热榜',url:'https://www.douyin.com/hot',status:failed?'error':'ok',error:failed?'测试：来源暂不可用':'',fetchedAt:failed?'':now,items:failed?[]:[{id:'dy-test',title:'AI 搜索新功能实测',summary:'',url:'https://www.douyin.com/search/AI',sourceId:'douyin',sourceName:'抖音热榜',kind:'douyin',publishedAt:now,fetchedAt:now,rank:4,hotValue:123456,dataKind:'live',favorite:false,ignored:false},{id:'dy-non-ai',title:'今天的晚霞',summary:'',url:'https://www.douyin.com/search/sky',sourceId:'douyin',sourceName:'抖音热榜',kind:'douyin',publishedAt:now,fetchedAt:now,rank:5,hotValue:100000,dataKind:'live',favorite:false,ignored:false}]},{sourceId:'qbitai',sourceName:'量子位',url:'https://www.qbitai.com',status:'ok',fetchedAt:now,items:[{id:'news-test',title:'大模型智能体新进展',summary:'公开来源测试摘要，用于验证线索到选题流程。',url:'https://example.com/news',sourceId:'qbitai',sourceName:'量子位',kind:'news',publishedAt:now,fetchedAt:now,rank:0,hotValue:0,dataKind:'live',favorite:false,ignored:false}]},{sourceId:'huggingface',sourceName:'Hugging Face 官方',url:'https://huggingface.co/blog',status:'error',error:'测试：请求超时',fetchedAt:'',items:[]}]};}
test('radar retrieval, triage, duplication, topic evaluation and creation preserve provenance',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let failed=false;
 await page.route('**/api/radar',route=>route.fulfill({json:payload(failed)}));
 await page.goto('/#radar');await expect(page.locator('.radar-card')).toHaveCount(2);
 await expect(page.locator('.heat-line')).toContainText('123,456');
 await expect(page.locator('.radar-sources')).toContainText('获取失败');
 await page.getByRole('button',{name:'收藏热点',exact:true}).first().click();
 await page.getByRole('button',{name:'刷新热点',exact:true}).click();await expect(page.locator('.radar-card')).toHaveCount(2);await expect(page.getByRole('button',{name:'取消收藏',exact:true})).toHaveCount(1);
 await page.screenshot({path:testInfo.outputPath('radar.png'),fullPage:true});
 await page.locator('.radar-card').filter({hasText:'AI 搜索新功能实测'}).getByRole('button',{name:'加入选题池',exact:true}).click();
 await page.getByLabel('受众相关').selectOption('5');await page.getByLabel('实用价值').selectOption('4');await page.getByLabel('演示可行').selectOption('4');await page.getByLabel('新鲜角度').selectOption('3');await page.getByLabel('拍摄优先级').selectOption('优先');
 await page.getByRole('button',{name:'保存选题',exact:true}).click();
 await expect(page.locator('.radar-card').filter({hasText:'AI 搜索新功能实测'}).getByRole('button',{name:'查看选题',exact:true})).toBeVisible();
 await page.locator('[data-route="topics"]').click();await expect(page.locator('.pool-row')).toHaveCount(1);await expect(page.locator('.pool-score strong')).toHaveText('84');
 await page.screenshot({path:testInfo.outputPath('pool.png'),fullPage:true});
 await page.getByRole('button',{name:'采纳并创建脚本',exact:true}).click();
 await expect(page.locator('[data-editor="hook"]')).toHaveValue(/真正需要知道/);await expect(page.locator('[data-editor="demo"]')).toHaveValue(/原始公告/);await expect(page.locator('[data-editor="sources"]')).toHaveValue(/douyin.com/);
 await page.locator('[data-route="radar"]').click();failed=true;await page.getByRole('button',{name:'刷新热点',exact:true}).click();await expect(page.locator('.radar-sources')).toContainText('测试：来源暂不可用');await expect(page.locator('.radar-card')).toHaveCount(2);
 await page.reload();await expect(page.locator('.radar-card')).toHaveCount(2);expect(errors).toEqual([]);
});
test('manual radar import and AI JSON preview produce persistent reviewed proposals',async({page})=>{
 await page.route('**/api/radar',route=>route.fulfill({json:payload()}));await page.goto('/#radar');await expect(page.locator('.radar-card')).toHaveCount(2);
 await page.getByRole('button',{name:'手动补充热点'}).click();await page.getByLabel('热点标题').fill('我在抖音看到的 AI 演示');await page.getByLabel('链接',{exact:false}).fill('https://example.com/manual');await page.getByRole('button',{name:'保存',exact:true}).click();await expect(page.locator('.radar-card')).toHaveCount(1);await expect(page.locator('.radar-card')).toContainText('手动录入');
 await page.locator('[data-route="topics"]').click();await page.getByRole('button',{name:'导入 AI 选题'}).click();await page.getByLabel('AI 返回的 JSON').fill('[{"title":"AI 引用怎么核验","angle":"从一次核验演示讲清","demoPlan":"打开原始论文","sources":"https://example.com/paper"}]');await page.getByRole('button',{name:'校验并预览'}).click();await expect(page.getByRole('heading',{name:'确认导入 1 条选题'})).toBeVisible();await page.getByRole('button',{name:'确认导入'}).click();await expect(page.locator('.pool-row')).toHaveCount(1);await expect(page.locator('.pool-row')).toContainText('待核验');await expect(page.locator('.pool-score strong')).toHaveText('—');await page.reload();await expect(page.locator('.pool-row')).toHaveCount(1);
});
