import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'*.spec.js',workers:1,timeout:30000,
 use:{baseURL:'http://127.0.0.1:4174',viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'},headless:true},
 webServer:{command:'node server.mjs',env:{PORT:'4174'},url:'http://127.0.0.1:4174',reuseExistingServer:true,timeout:10000},
 reporter:'list'
});
