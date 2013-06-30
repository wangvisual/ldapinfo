// license: GPL V3

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetchOther"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://app/modules/gloda/utils.js");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/aop.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");

const XMLHttpRequest = CC("@mozilla.org/xmlextras/xmlhttprequest;1"); // > TB15

let ldapInfoFetchOther =  {
  queue: [], // request queue
  currentAddress: null,
  hookedFunctions: [],
  timer: null,
  
  clearCache: function () {
    this.currentAddress = null;
  },
  
  cleanup: function() {
    try {
      ldapInfoLog.info("ldapInfoFetchOther cleanup");
      if ( this.timer ) {
        this.timer.cancel();
        this.timer = null;
      }
      this.unHook();
      if ( this.queryingTab ) {
        ldapInfoLog.info("ldapInfoFetchOther has queryingTab");
        let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        let tabmail = mail3PaneWindow.document.getElementById("tabmail");
        tabmail.unregisterTabMonitor(this.tabMonitor);
        tabmail.closeTab(this.queryingTab);
      }
      this.clearCache();
      if ( this.queue.length >= 1 && typeof(this.queue[0][0]) != 'undefined' ) {
        let callbackData = this.queue[0][0];
        if ( callbackData.req ) {
          ldapInfoLog.info("ldapInfoFetchOther abort current request");
          callbackData.req.abort();
        }
      }
      this.queue = [];
    } catch (err) {
      ldapInfoLog.logException(err);
    }
    ldapInfoLog.info("ldapInfoFetchOther cleanup done");
    ldapInfoLog = ldapInfoUtil = ldapInfoaop = null;
  },
  
  callBackAndRunNext: function(callbackData) {
    ldapInfoLog.info('callBackAndRunNext, now is ' + callbackData.address);
    delete callbackData.req;
    ldapInfoFetchOther.queue = ldapInfoFetchOther.queue.filter( function (args) { // call all callbacks if for the same address
      let cbd = args[0];
      if ( cbd.address != callbackData.address ) return true;
      try {
        if ( !( cbd === callbackData ) ) {
          if ( typeof(callbackData.src) != 'undefined' ) cbd.src = callbackData.src;
          cbd.validImage = callbackData.validImage;
          for ( let i in callbackData.ldap ) {
            cbd.ldap[i] = callbackData.ldap[i];
          }
        }
        cbd.image.classList.remove('ldapInfoLoading');
        cbd.callback(cbd);
      } catch (err) {
        ldapInfoLog.logException(err);
      }
      return false;
    });
    ldapInfoLog.logObject(this.queue.map( function(one) {
      return one[0].address;
    } ), 'after queue', 0);
    if (ldapInfoFetchOther.queue.length >= 1) {
      this._fetchOtherInfo.apply(ldapInfoFetchOther, ldapInfoFetchOther.queue[0]);
    } else {
      this.currentAddress = '';
    }
  },
  
  queueFetchOtherInfo: function(...theArgs) {
    ldapInfoLog.info('queueFetchOtherInfo');
    this.queue.push(theArgs);
    let callbackData = theArgs[0];
    if (this.queue.length === 1) {
      ldapInfoLog.info('queueFetchOtherInfo first');
      this._fetchOtherInfo.apply(this, theArgs);
    } else {
      let className = 'ldapInfoLoadingQueue';
      if ( callbackData.address == this.currentAddress ) className = 'ldapInfoLoading';
      callbackData.image.classList.add(className);
      ldapInfoLog.logObject(this.queue.map( function(one) {
        return one[0].address;
      } ), 'new URL queue', 0);
    }
  },
  
  _fetchOtherInfo: function (callbackData) {
    try {
      ldapInfoLog.info('_fetchOtherInfo');
      // flash the image border so user will know we're working
      if ( this.currentAddress != callbackData.address ) {
        this.currentAddress = callbackData.address;
        this.queue.forEach( function(args) {
          if ( args[0].address == ldapInfoFetchOther.currentAddress ) {
            args[0].image.classList.remove('ldapInfoLoadingQueue');
            args[0].image.classList.add('ldapInfoLoading');
          }
        } );
      }
      // if expire clean token
      if ( ldapInfoUtil.options.facebook_token && ( +ldapInfoUtil.options.facebook_token_expire <= Math.round(Date.now()/1000) ) ) {
        ldapInfoLog.log('Facebook token expire.', 1);
        let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
        ldapInfoUtil.options.facebook_token = "";
        branch.setCharPref('facebook_token', "");
      }
      if ( ldapInfoUtil.options.load_from_facebook && ldapInfoUtil.options.facebook_token == "" ) {
        ldapInfoLog.info('get_access_token');
        this.get_access_token();
        if ( !this.timer ) this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        this.timer.initWithCallback( function() { // can be function, or nsITimerCallback
          if ( ldapInfoLog && ldapInfoFetchOther ) {
            ldapInfoLog.info('Timeout');
            ldapInfoFetchOther._fetchOtherInfo(callbackData);
          }
        }, 1000, Ci.nsITimer.TYPE_ONE_SHOT );
        return;
      }
      callbackData.tryURLs = [];
      if ( ldapInfoUtil.options.load_from_facebook ) {
        if ( callbackData.mailDomain == "facebook.com" ) {
          callbackData.ldap.id = [callbackData.mailid];
          callbackData.ldap.profile = ['https://www.facebook.com/' + callbackData.mailid];
        } else {
          // search?q=who@gmail.com&fields=name,link,id,work,about,picture&limit=2&type=user
          callbackData.tryURLs.push([callbackData.address, "https://graph.facebook.com/search?type=user&limit=1&q=" + callbackData.address + "&access_token=" + ldapInfoUtil.options.facebook_token, "FacebookSearch"]);
          //callbackData.tryURLs.push([callbackData.address, "https://www.facebook.com/search.php?type=user&q=" + callbackData.address + "&access_token=" + ldapInfoUtil.options.facebook_token, "FacebookSearch"]);
        }
        callbackData.tryURLs.push([callbackData.address, "https://graph.facebook.com/__UID__/picture", "Facebook"]);
      }
      if ( ldapInfoUtil.options.load_from_google && ["gmail.com", "googlemail.com"].indexOf(callbackData.mailDomain)>= 0 ) {
        callbackData.mailid = callbackData.mailid.replace(/\+.*/, '');
        callbackData.tryURLs.push([callbackData.address, "https://profiles.google.com/s2/photos/profile/" + callbackData.mailid, "Google"]);
        //callbackData.tryURLs.push([callbackData.address, "https://plus.google.com/s2/photos/profile/" + callbackData.mailid, "Google+"]);
      }
      if ( ldapInfoUtil.options.load_from_gravatar ) {
        let hash = GlodaUtils.md5HashString( callbackData.address );
        callbackData.tryURLs.push([callbackData.address, 'http://www.gravatar.com/avatar/' + hash + '?d=404', "Gravatar"]);
      }
      this.loadRemote(callbackData);
    } catch (err) {
      ldapInfoLog.logException(err);
      callbackData.ldap['_Status'] = ['Exception'];
      this.callBackAndRunNext(callbackData); // with failure
    }
  },
  
  loadRemote: function(callbackData) {
    try {
      let current = callbackData.tryURLs.shift();
      if ( typeof(current) == 'undefined' ) {
        callbackData.ldap._dn = [];
        callbackData.ldap._Status = ["No LDAP server avaiable"];
        return ldapInfoFetchOther.callBackAndRunNext(callbackData); // failure
      }
      if ( current[2] == 'Facebook' ) current[1] = current[1].replace('__UID__', callbackData.ldap.id);
      ldapInfoLog.info('loadRemote ' + current[1]);
      let isFacebookSearch = ( current[2] == 'FacebookSearch' );
      let oReq = XMLHttpRequest();
      oReq.open("GET", current[1], true);
      //oReq.setRequestHeader('Referer', 'https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/');
      // cache control ?
      oReq.responseType = isFacebookSearch ? 'json' : 'arraybuffer';
      oReq.timeout = ldapInfoUtil.options['ldapTimeoutInitial'] * 1000;
      oReq.withCredentials = true;
      oReq.onloadend = function() {
        oReq.onloadend = null;
        delete callbackData.req;
        let success = ( oReq.status == "200" && oReq.response && ( !isFacebookSearch || ( isFacebookSearch && oReq.response.data[0] ) ) ) ? true : false;
        ldapInfoLog.info('XMLHttpRequest status ' + oReq.status + ":" + success);
        if ( !success && oReq.status == "200" ) ldapInfoLog.logObject(oReq.response,'oReq.response',1);
        if ( success ) {
          if ( isFacebookSearch ) {
            let entry = oReq.response.data[0];
            callbackData.ldap.name = [entry.name];
            callbackData.ldap.id = [entry.id];
            callbackData.ldap.profile = ['https://www.facebook.com/' + entry.id];
            ldapInfoFetchOther.loadRemote(callbackData);
          } else {
            callbackData.ldap._dn = [];
            if ( current[2].indexOf('Google') == 0 ) callbackData.ldap.profile = ["https://profiles.google.com/" + callbackData.mailid];
            callbackData.ldap._Status = ['From ' + current[2]];
            let type = oReq.getResponseHeader('Content-Type') || 'image/png'; // image/gif or application/json; charset=utf-8 or text/html; charset=utf-8
            let binary = String.fromCharCode.apply(null, new Uint8Array(oReq.response));
            let win = callbackData.win.get();
            if ( win && win.document ) {
              callbackData.src = "data:" + type + ";base64," + win.btoa(binary);
              callbackData.validImage = true;
            }
            ldapInfoFetchOther.callBackAndRunNext(callbackData); // success
          }
        } else { // not success
          if ( isFacebookSearch ) callbackData.tryURLs.shift();
          ldapInfoFetchOther.loadRemote(callbackData);
        }
        oReq.abort(); // without abort, when disable add-on, it takes quite a while to unload this js module
      };
      callbackData.req = oReq; // only the latest request will be saved for later posibble abort
      oReq.send();
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
  
  queryingTab: null,
  get_access_token: function() {
    if ( this.queryingTab || ldapInfoUtil.options.facebook_token ) return;
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      let tabmail = mail3PaneWindow.document.getElementById("tabmail");
      if ( !tabmail ) return;
      tabmail.registerTabMonitor(ldapInfoFetchOther.tabMonitor);
      mail3PaneWindow.focus();
      let client= "client_id=437279149703221";
      let scope = "";
      let redirect = "&redirect_uri=https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/";
      let type = "&response_type=token";
      this.queryingTab = tabmail.openTab( "contentTab", { contentPage: "https://www.facebook.com/dialog/oauth?" + client + scope + redirect + type,
                                                          background: false,
                                                          onListener: function(browser, listener) { // aArgs.onListener(aTab.browser, aTab.progressListener);
                                                            ldapInfoFetchOther.hookedFunctions.push( ldapInfoaop.around( {target: listener, method: 'onLocationChange'}, function(invocation) {
                                                              let [, , aLocationURI, ] = invocation.arguments; // aWebProgress, aRequest, aLocationURI, aFlags
                                                              if ( aLocationURI.host == 'addons.mozilla.org' ) {
                                                                // 'access_token=xxx&expires_in=5179267'
                                                                let splitResult = /^access_token=(.+)&expires_in=(\d+)/.exec(aLocationURI.ref);
                                                                if ( splitResult != null ) {
                                                                  let [, facebook_token, facebook_token_expire ] = splitResult;
                                                                  Services.console.logStringMessage('token: ' + facebook_token + ":" + facebook_token_expire);
                                                                  facebook_token_expire = ( +facebook_token_expire + Math.round(Date.now()/1000) - 60 ) + "";
                                                                  let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
                                                                  branch.setCharPref('facebook_token', facebook_token); // will update ldapInfoUtil.options.facebook_token through the observer
                                                                  branch.setCharPref('facebook_token_expire', facebook_token_expire);
                                                                }
                                                                ldapInfoFetchOther.unHook();
                                                                return tabmail.closeTab(ldapInfoFetchOther.queryingTab);
                                                              }
                                                              return invocation.proceed();;
                                                            })[0] );
                                                          }
      });
    }
  },
  
  unHook: function() {
    this.hookedFunctions.forEach( function(hooked) {
      hooked.unweave();
    } );
    this.hookedFunctions = [];
  },
  
  tabMonitor: {
    monitorName: 'ldapinfoTabMonitor',
    onTabClosing: function(tab) {
      if ( !ldapInfoFetchOther ) return; // unload error
      if ( tab === ldapInfoFetchOther.queryingTab ) {
        let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        let tabmail = mail3PaneWindow.document.getElementById("tabmail");
        tabmail.unregisterTabMonitor(ldapInfoFetchOther.tabMonitor);
        if ( !ldapInfoUtil.options.facebook_token ) {
          ldapInfoLog.log("Get token failed, disabled facebook support", 1);
          let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
          branch.setBoolPref('load_from_facebook', false);
        }
        ldapInfoFetchOther.queryingTab = null;
      }
    },
    onTabSwitched: function(tab) {},
    onTabTitleChanged: function(tab) {}
  },

}