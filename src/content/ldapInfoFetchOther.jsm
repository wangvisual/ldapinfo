// license: GPL V3

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetchOther"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://app/modules/gloda/utils.js");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");

const XMLHttpRequest = CC("@mozilla.org/xmlextras/xmlhttprequest;1"); // > TB15

let ldapInfoFetchOther =  {
  queue: [], // request queue
  currentAddress: null,
  
  clearCache: function () {
    this.queryingToken = false;
  },
  
  cleanup: function() {
    try {
      ldapInfoLog.info("ldapInfoFetchOther cleanup");
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
    this.currentAddress = ldapInfoLog = ldapInfoUtil = null;
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
      if ( ldapInfoUtil.options.load_from_facebook && ldapInfoUtil.options.facebook_token == "" ) {
        let win = callbackData.win.get();
        this.get_access_token();
        if ( win && win.document ) {
          win.setTimeout( function() {
            ldapInfoFetchOther._fetchOtherInfo(callbackData);
          }, 1000 );
          return;
        }
      }
      this.currentAddress = callbackData.address;
      this.queue.forEach( function(args) {
        if ( args[0].address == ldapInfoFetchOther.currentAddress ) {
          args[0].image.classList.remove('ldapInfoLoadingQueue');
          args[0].image.classList.add('ldapInfoLoading');
        }
      } );
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
        let mailID = callbackData.mailid.replace(/\+.*/, '');
        callbackData.tryURLs.push([callbackData.address, "https://profiles.google.com/s2/photos/profile/" + mailID, "Google"]);
        //callbackData.tryURLs.push([callbackData.address, "https://plus.google.com/s2/photos/profile/" + mailID, "Google+"]);
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
      let oReq = new XMLHttpRequest();
      oReq.open("GET", current[1], true);
      //oReq.setRequestHeader('Referer', 'https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/');
      // cache control ?
      oReq.responseType = isFacebookSearch ? 'json' : 'arraybuffer';
      oReq.timeout = ldapInfoUtil.options['ldapTimeoutInitial'] * 1000;
      oReq.withCredentials = true;
      oReq.onloadend = function() {
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
        } else {
          if ( isFacebookSearch ) callbackData.tryURLs.shift();
          ldapInfoFetchOther.loadRemote(callbackData);
        }
      };
      callbackData.req = oReq;
      oReq.send();
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
  
  queryingToken: false,  
  get_access_token: function() {
    if ( this.queryingToken || ldapInfoUtil.options.facebook_token ) return;
    this.queryingToken = true;
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      let tabmail = mail3PaneWindow.document.getElementById("tabmail");
      if ( !tabmail ) return;
      mail3PaneWindow.focus();
      let client= "client_id=437279149703221";
      let scope = "";
      let redirect = "&redirect_uri=https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/";
      let type = "&response_type=token";
      let tab = tabmail.openTab( "contentTab", { contentPage: "https://www.facebook.com/dialog/oauth?" + client + scope + redirect + type,
                                                 background: false,
                                                 onListener: function(browser, listener){
                                                   listener.onLocationChange = function(aWebProgress, aRequest, aLocationURI, aFlags) {
                                                     if ( aLocationURI.host == 'addons.mozilla.org' ) {
                                                       // 'access_token=xxx&expires_in=5179267'
                                                       let splitResult = /^access_token=(.+)&expires_in=(\d+)/.exec(aLocationURI.ref);
                                                       if ( splitResult != null ) {
                                                         let [, facebook_token, facebook_token_expire ] = splitResult;
                                                         Services.console.logStringMessage('token: ' + facebook_token + ":" + facebook_token_expire);
                                                         facebook_token_expire = ( +facebook_token_expire + Date.now() / 1000 - 60 ) + "";
                                                         let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
                                                         branch.setCharPref('facebook_token', facebook_token); // will update ldapInfoUtil.options.facebook_token through the observer
                                                         branch.setCharPref('facebook_token_expire', facebook_token_expire);
                                                       }
                                                       tabmail.closeTab(tab);
                                                       // ldapInfoFetchOther.queryingToken = false;
                                                     }
                                                   };
                                                 }
      });
      tab.browser.addEventListener("DOMWindowClose", ldapInfoFetchOther.tabClosed, true);
    }
  },
  
  tabClosed: function(event) {
    ldapInfoLog.info('tabClosed');
    ldapInfoLog.logObject(event,'event',0);
    let browser = event.currentTarget;
    browser.removeEventListener("DOMWindowClose", ldapInfoFetchOther.tabClosed, true);
    ldapInfoFetchOther.queryingToken = false;
  },
}