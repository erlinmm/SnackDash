/* Snack Dash localization foundation. No network, dependencies or HTML injection. */
(function(root){
  'use strict';
  const DEFAULT_LOCALE='en-GB';
  const STORAGE_KEY=root.SnackDashRuntime?.storage?.locale??'snackDashLocaleV1';
  const catalogs=new Map();
  const listeners=new Set();
  let currentLocale=DEFAULT_LOCALE;

  function registerLocale(code,messages,options={}){
    if(typeof code!=='string'||!code.trim()||!messages||typeof messages!=='object')
      throw new TypeError('A locale needs a code and a message catalog');
    const filtered={};
    for(const [key,value] of Object.entries(messages)){
      if(typeof value!=='string')throw new TypeError('Translation values must be strings: '+key);
      filtered[key]=value;
    }
    catalogs.set(code,{messages:Object.freeze(filtered),label:options.label||code,dir:options.dir==='rtl'?'rtl':'ltr'});
    return code;
  }
  function availableLocales(){
    return Array.from(catalogs,([code,entry])=>({code,label:entry.label,dir:entry.dir}));
  }
  function locale(){return currentLocale;}
  function hasTranslation(key,code=currentLocale){
    return typeof catalogs.get(code)?.messages[key]==='string';
  }
  function keys(code=DEFAULT_LOCALE){
    return Object.keys(catalogs.get(code)?.messages||{});
  }
  function lookup(key,code=currentLocale){
    return catalogs.get(code)?.messages[key]??catalogs.get(DEFAULT_LOCALE)?.messages[key]??null;
  }
  function t(key,params={}){
    const pattern=lookup(key)??key;
    return pattern.replace(/\{\{([\w]+)\}\}/g,(_,name)=>Object.prototype.hasOwnProperty.call(params,name)?String(params[name]):'{{'+name+'}}');
  }
  function getSavedLocale(){
    try{return root.localStorage?.getItem(STORAGE_KEY)||null;}catch(_){return null;}
  }
  function init(){
    const stored=getSavedLocale();
    currentLocale=stored&&catalogs.has(stored)?stored:DEFAULT_LOCALE;
    apply();
    return currentLocale;
  }
  function apply(scope){
    const doc=root.document;
    if(!doc)return;
    doc.documentElement.lang=currentLocale;
    doc.documentElement.dir=catalogs.get(currentLocale)?.dir||'ltr';
    if(lookup('app.title'))doc.title=t('app.title');
    const parent=scope||doc;
    const attrs=['data-i18n','data-i18n-aria-label','data-i18n-title','data-i18n-placeholder','data-i18n-content'];
    const selector=attrs.map(a=>'['+a+']').join(',');
    const nodes=Array.from(parent.querySelectorAll(selector));
    if(typeof parent.matches==='function'&&parent.matches(selector))nodes.unshift(parent);
    for(const node of nodes){
      const key=node.getAttribute('data-i18n');
      if(key)node.textContent=t(key);
      for(const [from,to] of [['data-i18n-aria-label','aria-label'],['data-i18n-title','title'],['data-i18n-placeholder','placeholder'],['data-i18n-content','content']]){
        const k=node.getAttribute(from);
        if(k)node.setAttribute(to,t(k));
      }
    }
  }
  function setLocale(code){
    if(!catalogs.has(code))return false;
    if(currentLocale===code)return true;
    currentLocale=code;
    try{root.localStorage?.setItem(STORAGE_KEY,code);}catch(_){/* Offline/private storage can be unavailable */ }
    apply();
    for(const listener of listeners)listener(code);
    return true;
  }
  function subscribe(callback){
    listeners.add(callback);
    return ()=>listeners.delete(callback);
  }
  function formatNumber(value,options={}){
    return new Intl.NumberFormat(currentLocale,options).format(value);
  }
  // Festival records will keep a real, immutable native name and an independent
  // player-language key. No machine-generated or invented event names.
  function activityLabel(activity){
    if(!activity||typeof activity.nativeName!=='string')throw new TypeError('Activity nativeName is required');
    return {
      nativeName:activity.nativeName,
      nativeLocale:activity.nativeLocale||'',
      explanation:activity.labelKey?lookup(activity.labelKey)||'':''
    };
  }
  const api=Object.freeze({DEFAULT_LOCALE,STORAGE_KEY,registerLocale,availableLocales,
    locale,lookup,hasTranslation,keys,t,init,apply,setLocale,subscribe,formatNumber,activityLabel});
  root.GameI18n=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
