import TelegramBot from 'node-telegram-bot-api';

const pluginName = "Outlier alert over messaging";

let dbglogPlugin = ()=>{};

if(process.env.OTDEBUG == "true")
    dbglogPlugin = console.log;

class OutlierDetector{
  
  constructor(params={}){
    this.windowSize = isNaN(params.windowSize) ? 10 : params.windowSize;
    this.avgHistoryWeight = isNaN(params.avgHistoryWeight) ? .9 : params.avgHistoryWeight;
    this.stdHistoryWeight = isNaN(params.stdHistoryWeight) ? .9 : params.stdHistoryWeight;
    this.upperOutlierSensitivity = isNaN(params.upperOutlierSensitivity) ? 3 : params.upperOutlierSensitivity;
    this.lowerOutlierSensitivity = isNaN(params.lowerOutlierSensitivity) ? 3 : params.lowerOutlierSensitivity;
    this.avgHistory =  NaN;
    this.stdHistory = NaN;
    this.window = [];
    this.windowCursor = 0;
    this.debug = false;
  }
  
  dbglog(msg){
    if(this.debug)
      dbglogPlugin(`[${new Date().toUTCString()}]${msg}`);
  }

  computeAvg(){
    
    const sum = this.window.reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
    const avg = (sum / this.window.length) || 0;
    this.dbglog(`computeAvg():${this.window} --> ${avg.toFixed(3)}`);  
    return avg
  }  

  computeStd() {
    const n = this.window.length;
    const avg = this.window.reduce((a, b) => parseFloat(a) + parseFloat(b)) / n;
    const std =Math.sqrt(this.window.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / n);
    this.dbglog(`computeStd():${this.window} --> ${std.toFixed(3)}`);  
    return std;
  }

  addValue(v){
      this.dbglog(`addValue(${v})----------------------------------------`); 
      this.dbglog(`addValue(${v}):[${this.window}] # ${this.windowCursor}`);  
      this.window[this.windowCursor] = v;
      this.windowCursor++;
      this.dbglog(`addValue(${v}):[${this.window}] # ${this.windowCursor}`);  

      if(this.windowCursor==this.windowSize){
        this.window = this.window.slice(0,this.windowCursor);
        this.windowCursor = 0;
        this.dbglog(`addValue(${v}): Limit reached --> window: ${this.window}`);  
      }

      if (isNaN(this.avgHistory)){
        this.dbglog(`addValue(${v}): NO avgHistory, computing Avg!`);  
        this.avgHistory = this.computeAvg();
      }

      if (isNaN(this.stdHistory)){
        this.dbglog(`addValue(${v}): NO stdHistory, computing Std!`);  
        this.stdHistory = this.computeStd();        
      }

      if(this.debug)
        this.printParams();

      this.avgHistory = (this.avgHistoryWeight*this.avgHistory) + (1-this.avgHistoryWeight)*this.computeAvg(this.window);
      this.dbglog(`addValue(${v}): avgHistory = (${this.avgHistoryWeight}*${this.avgHistory.toFixed(3)}) + (1-${this.avgHistoryWeight})*${this.computeAvg(this.window).toFixed(3)}`);  
      if(this.stdHistory == 0) { // old window had 1 value (or all their values were the same)
        this.stdHistory = this.computeStd(this.window);
      }else{  // normal cases
        this.stdHistory = (this.stdHistoryWeight*this.stdHistory) + (1-this.stdHistoryWeight)*this.computeStd(this.window);
        this.dbglog(`addValue(${v}): stdHistory = (${this.stdHistoryWeight}*${this.stdHistory.toFixed(3)}) + (1-${this.stdHistoryWeight})*${this.computeStd(this.window).toFixed(3)}`);  
      }
      
      this.dbglog(`addValue(${v}): avg=${this.avgHistory.toFixed(3)}, std=${this.stdHistory.toFixed(3)}`);  
  }
  
  isOutlier(v){
      return (v > (this.avgHistory+(this.upperOutlierSensitivity*this.stdHistory))) || 
             (v < (this.avgHistory-(this.lowerOutlierSensitivity*this.stdHistory))) ;
  }

  printParams(){
    dbglogPlugin(this.getParams());
  }

  getParams(){
    let paramStr =  `Window: [${this.window}] # ${this.windowCursor}\n`;
        paramStr += `Average: ${this.avgHistory.toFixed(3)}, StdDev : ${this.stdHistory.toFixed(3)}\n`;
        paramStr += `Range: ${this.getRange()}\n`;
    return paramStr;
  }

  getRange(){
    return `[${(this.avgHistory-(this.lowerOutlierSensitivity*this.stdHistory)).toFixed(3)},${(this.avgHistory+(this.upperOutlierSensitivity*this.stdHistory)).toFixed(3)}]`;
  }
}

function calculateTiming(startSecInput,startNanoSecInput,endSecInput,endNanoSecInput,precision = 3){
  // Default precision 3 = miliseconds

  let startSec= parseFloat(startSecInput)
  let startNanoSec= parseFloat(startNanoSecInput)
  let endSec= parseFloat(endSecInput)
  let endNanoSec= parseFloat(endNanoSecInput)

  let startNanoSecParsed = parseFloat("0."+startNanoSec);
  let endNanoSecParsed = parseFloat("0."+endNanoSec);

  let preciseStart = parseFloat(startSec + startNanoSecParsed);
  let preciseEnd = parseFloat(endSec + endNanoSecParsed);
  let preciseDuration = parseFloat(preciseEnd-preciseStart);

  let startDate = new Date(preciseStart.toFixed(precision)*1000);
  let startTS = startDate.toISOString();

  let endDate = new Date(preciseEnd.toFixed(precision)*1000);
  let endTS = endDate.toISOString();

  return {
      preciseStart: preciseStart,
      preciseEnd : preciseEnd,
      preciseDuration : preciseDuration,
      start : parseFloat(preciseStart.toFixed(precision)),
      end: parseFloat(preciseEnd.toFixed(precision)),
      duration : parseFloat(preciseDuration.toFixed(precision)),
      startDate: startDate,
      endDate: endDate,
      startTS :startTS,
      endTS: endTS
  };

}

function parseTraceInfo(t){
  const ep = t.attributes.http.target;
  const method = t.attributes.http.method.toLowerCase();
  const status = t.attributes.http.status_code;
  
  const timing = calculateTiming(t.startTime[0],t.startTime[1],t.endTime[0],t.endTime[1]);

  return {
      ts : timing.startTS,
      ep: ep,
      method: method,
      status: status,
      duration: Math.max(timing.duration,0)
  };
}

class OutlierMessagingPlugin{
  static name = "";
  trainigValueThreshold
  static od = new OutlierDetector();
  static trainigValueThreshold;
  static trainingValuesCount = 0;
  static configured = false;
  static alertChannelToken;
  static alertChannelGroupId;
  static messagingBot;
  static load(config={}){
    OutlierMessagingPlugin.name = pluginName;
    dbglogPlugin(`Configuring plugin <${OutlierMessagingPlugin.name}> with config: \n${JSON.stringify(config,null,2)}...`);

    if(!config.alertChannel){
        dbglogPlugin(`ERROR configuring plugin <${OutlierMessagingPlugin.name}>: Missing 'alertChannel' configuration`);
    }else{
      if (config.alertChannel.type == "telegram-bot"){
        OutlierMessagingPlugin.alertChannelToken = config.alertChannel.token;
        OutlierMessagingPlugin.alertChannelGroupId = config.alertChannel.groupId;
        if(  OutlierMessagingPlugin.alertChannelToken && OutlierMessagingPlugin.alertChannelToken){
          OutlierMessagingPlugin.messagingBot = new TelegramBot(OutlierMessagingPlugin.alertChannelToken);
          OutlierMessagingPlugin.trainigValueThreshold = config.trainigValueThreshold || 10;
          dbglogPlugin(`Configured plugin <${OutlierMessagingPlugin.name}> with configuration:`);
          dbglogPlugin(`   - trainigValueThreshold: ${OutlierMessagingPlugin.trainigValueThreshold}`);
          dbglogPlugin(`   - alertChannelToken: ${OutlierMessagingPlugin.alertChannelToken}`);
          dbglogPlugin(`   - alertChannelGroupId: ${OutlierMessagingPlugin.alertChannelGroupId}`);
          OutlierMessagingPlugin.sendMessage(`${OutlierMessagingPlugin.name} plugin configured in this channel!`);  
          OutlierMessagingPlugin.configured = true;  
        }else{
          dbglogPlugin(`Unsupported alertChannel configuration: ${JSON.stringify(config.alertChannel)}`);   
        }
      }else{
        dbglogPlugin(`Unsupported alertChannel configuration (type ${config.alertChannel.type}`); 
      }
    }
  };
  static isConfigured(){
    return OutlierMessagingPlugin.configured;
  };
  static getName(){
    return OutlierMessagingPlugin.name;
  };
  static sendMessage(msg){ 
    //alertChannelGroupId === chatId in telegram
    dbglogPlugin(`[${OutlierMessagingPlugin.alertChannelGroupId}] Sending:\n${msg}`);
    OutlierMessagingPlugin.messagingBot.sendMessage(OutlierMessagingPlugin.alertChannelGroupId, msg).then(()=>{
      return;
    }).catch((error) => {
      dbglogPlugin(error.code);
      dbglogPlugin(error.response.body);
    });  
  }
  static newValue(v,reqInfo){
    if(OutlierMessagingPlugin.trainingValuesCount < OutlierMessagingPlugin.trainigValueThreshold){
      OutlierMessagingPlugin.trainingValuesCount++;
      dbglogPlugin(`Processing Trainig Request response time #${OutlierMessagingPlugin.trainingValuesCount}: ${v} s.`);
      dbglogPlugin(`Current trained outlier detection range: ${OutlierMessagingPlugin.od.getRange()} s.`);  
      return OutlierMessagingPlugin.od.addValue(v);
    } else if(OutlierMessagingPlugin.od.isOutlier(v)){
      //Outlier debug: OutlierMessagingPlugin.sendMessage(` New Outlier: ${v}\n ${OutlierMessagingPlugin.od.getParams()}`);
      OutlierMessagingPlugin.sendMessage(` Abnormal response time on ${reqInfo.method} to <${reqInfo.target}> with status ${reqInfo.status_code}\n Responsetime was ${v} s. out of the typical range ${OutlierMessagingPlugin.od.getRange()} s.`);
    } 
  };
  static newTrace(t){
    if(t.attributes == undefined || t.attributes.http == undefined){
      console.error(`Unkown Trace format received in plugin ${OutlierMessagingPlugin.name} The abnormal Trace content is ${t}`);
      return;
    }
    let reqInfo = t.attributes.http;
    dbglogPlugin(`New trace received in Plugin: ${reqInfo.method} to <${reqInfo.target}> with status ${reqInfo.status_code} `);
    let tInfo = parseTraceInfo(t);
    OutlierMessagingPlugin.newValue(tInfo.duration,reqInfo);
  };
}

dbglogPlugin("Instantiating plugin....");
const plugin = OutlierMessagingPlugin;
export default {plugin};
dbglogPlugin(`Plugin <${pluginName}> instantiated!`);

