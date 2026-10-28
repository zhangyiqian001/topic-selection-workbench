import {printNetwork} from '../backend/network.mjs';
import {BACKEND_REVISION} from '../backend/runtime.mjs';
const url='http://127.0.0.1:'+Number(process.env.PORT||4173);
try{
 const response=await fetch(url+'/api/state',{signal:AbortSignal.timeout(2000)});
 const state=await response.json();
 if(state.runtime?.backend_revision===BACKEND_REVISION){if(process.env.STUDIO_LAN==='1'&&!state.runtime?.network?.lan_enabled){console.error('The studio is running in LOCAL-ONLY mode. Close its server window, then run this launcher again to enable LAN access.');process.exitCode=20;}else{console.log('The current studio service is already running.');if(state.runtime?.network)printNetwork(state.runtime.network);else console.log(url);process.exitCode=10;}}
 else{console.error('An OLD studio service is still running at '+url);console.error('Close the previous studio server window, then run this launcher again.');console.error('Refreshing the browser does not restart the server.');process.exitCode=20;}
}catch(error){if(error.cause?.code==='ECONNREFUSED'||error.cause?.code==='UND_ERR_CONNECT_TIMEOUT')process.exitCode=0;else{console.error('A service may already be using '+url+'. Close its old studio window before starting.');process.exitCode=20;}}
