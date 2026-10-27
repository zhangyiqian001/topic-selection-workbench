import {test,expect} from '@playwright/test';
test('v2 screening is visible, filterable and weight settings persist',async({page,request})=>{
 await request.post('/api/raw',{data:{title:'ChatGPT AI 教程实测对比',summary:'如何使用提示词整理办公文档，提供详细步骤与工作流，便于录屏展示。',url:'https://example.com/screening-v2',published_at:new Date().toISOString()}});
 await page.goto('/#inbox');const card=page.locator('.raw-card').filter({hasText:'ChatGPT AI 教程实测对比'});await expect(card.locator('.score-breakdown summary')).toContainText('AI 科普优先分');await card.locator('.score-breakdown summary').click();await expect(card).toContainText('中性先验');await expect(card).toContainText('实用内容线索');await page.getByLabel('优先分筛选').selectOption('55');await expect(card).toBeVisible();
 await page.goto('/#settings');await page.getByLabel('AI 方向匹配初筛权重（%）',{exact:true}).fill('40');await page.getByLabel('平台关注度初筛权重（%）',{exact:true}).fill('10');await page.getByRole('button',{name:'保存全部设置'}).click();await expect(page.getByRole('status')).toContainText('重算');await page.reload();await expect(page.getByLabel('AI 方向匹配初筛权重（%）',{exact:true})).toHaveValue('40');
});
