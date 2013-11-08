// license: GPL V3

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetchOther"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
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
  facebookRedirect: 'https://www.facebook.com/connect/login_success.html',
  
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
    ldapInfoLog.info('callBackAndRunNextOther, now is ' + callbackData.address);
    delete callbackData.req;
    ldapInfoFetchOther.queue = ldapInfoFetchOther.queue.filter( function (args) { // call all callbacks if for the same address
      let cbd = args[0];
      if ( cbd.address != callbackData.address ) return true;
      try {
        cbd.image.classList.remove('ldapInfoLoadingOther');
        cbd.callback(cbd);
      } catch (err) {
        ldapInfoLog.logException(err);
      }
      return false;
    });
    //ldapInfoLog.logObject(this.queue.map( function(one) {
    //  return one[0].address;
    //} ), 'after queue', 0);
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
    callbackData.tryURLs = [];
    if ( ldapInfoUtil.options.load_from_facebook && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.facebook.state) >= 0 ) { // maybe ignored if user later cancel oAuth
      callbackData.cache.facebook.state = ldapInfoUtil.STATE_QUERYING;
      if ( callbackData.mailDomain == "facebook.com" ) {
        callbackData.cache.facebook.id = [callbackData.mailid];
        callbackData.cache.facebook['Facebook Profile'] = ['https://www.facebook.com/' + callbackData.mailid];
      } else {
        // search?q=who@gmail.com&fields=name,link,id,work,about,picture&limit=2&type=user
        //callbackData.tryURLs.push([callbackData.address, "https://graph.facebook.com/search?type=user&limit=1&q=" + callbackData.address + "&access_token=__FACEBOOK__TOKEN__", "FacebookSearch"]);
        //callbackData.tryURLs.push([callbackData.address, "https://www.facebook.com/search.php?type=user&q=" + callbackData.address + "&access_token=__FACEBOOK__TOKEN__", "FacebookWebSearch"]);
        let query = "SELECT username,birthday_date,relationship_status,pic_big FROM user WHERE uid IN ( SELECT uid FROM email WHERE email='" + ldapInfoUtil.crc32md5(callbackData.address) + "' )";
        callbackData.tryURLs.push([callbackData.address, "https://api.facebook.com/method/fql.query?format=json&access_token=__FACEBOOK__TOKEN__&query=" + query, "FacebookFQLSearch"]);
        // <div class="instant_search_title fsl fwb fcb"><a href="https://www.facebook.com/aaa" onclick=...">aaa bbb</a></div>
      }
      callbackData.tryURLs.push([callbackData.address, "https://graph.facebook.com/__UID__/picture", "Facebook", 'facebook']);
    }
    if ( ldapInfoUtil.options.load_from_linkedin && ldapInfoUtil.options.linkedin_user && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.linkedin.state) >= 0) {
      callbackData.cache.linkedin.state = ldapInfoUtil.STATE_QUERYING;
      let URL = "https://outlook.linkedinlabs.com/osc/login";
      let passwd = "";
      if ( !ldapInfoUtil.options.linkedin_token ) {
        passwd = ldapInfoUtil.getPasswordForServer(URL, ldapInfoUtil.options.linkedin_user, false, "");
        if ( passwd ) callbackData.tryURLs.push([callbackData.address, URL, "LinkedInToken", "key=" + ldapInfoUtil.options.linkedin_user + "&pw=" + passwd]);
      }
      if ( ldapInfoUtil.options.linkedin_token || passwd ) {
        callbackData.tryURLs.push([callbackData.address, "http://linkedin.com/osc/people", "LinkedInSearch"]);
        callbackData.tryURLs.push([callbackData.address, "LINKEDIN_PIC", "LinkedIn", "linkedin"]);
      }
    }
    if ( ldapInfoUtil.options.load_from_google && ["gmail.com", "googlemail.com"].indexOf(callbackData.mailDomain)>= 0 && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.google.state) >= 0) {
      callbackData.cache.google.state = ldapInfoUtil.STATE_QUERYING;
      callbackData.mailid = callbackData.mailid.replace(/\+.*/, '');
      callbackData.tryURLs.push([callbackData.address, "https://profiles.google.com/s2/photos/profile/" + callbackData.mailid, "Google", 'google']);
      //callbackData.tryURLs.push([callbackData.address, "https://plus.google.com/s2/photos/profile/" + callbackData.mailid, "Google+", 'google']);
    } else callbackData.cache.google = { state: ldapInfoUtil.STATE_DONE, _Status: ['Google \u2718'] };
    if ( ldapInfoUtil.options.load_from_gravatar && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.gravatar.state) >= 0 ) {
      callbackData.cache.gravatar.state = ldapInfoUtil.STATE_QUERYING;
      callbackData.gravatarHash = GlodaUtils.md5HashString( callbackData.address );
      callbackData.tryURLs.push([callbackData.address, 'http://www.gravatar.com/avatar/' + callbackData.gravatarHash + '?d=404', "Gravatar", 'gravatar']);
    }
    
    if (this.queue.length === 1) {
      ldapInfoLog.info('queueFetchOtherInfo first');
      this._fetchOtherInfo.apply(this, theArgs);
    } else {
      let className = 'ldapInfoLoadingQueueOther';
      if ( callbackData.address == this.currentAddress ) className = 'ldapInfoLoadingOther';
      callbackData.image.classList.add(className);
      //ldapInfoLog.logObject(this.queue.map( function(one) {
      //  return one[0].address;
      //} ), 'new URL queue', 0);
    }
  },
  
  _fetchOtherInfo: function (callbackData) {
    try {
      ldapInfoLog.info('_fetchOtherInfo');
      // flash the image border so user will know we're working
      this.currentAddress = callbackData.address;
      this.queue.forEach( function(args) {
        if ( args[0].address == ldapInfoFetchOther.currentAddress ) {
          args[0].image.classList.remove('ldapInfoLoadingQueueOther');
          args[0].image.classList.add('ldapInfoLoadingOther');
        }
      } );
      // if expire clean token
      if ( ldapInfoUtil.options.facebook_token && ( +ldapInfoUtil.options.facebook_token_expire <= Math.round(Date.now()/1000) ) ) {
        ldapInfoLog.log('Facebook token expire.', 1);
        let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
        ldapInfoUtil.options.facebook_token = "";
        branch.setCharPref('facebook_token', "");
      }
      if ( ldapInfoUtil.options.load_from_facebook && ldapInfoUtil.options.facebook_token == "" && !Services.io.offline ) {
        ldapInfoLog.info('get_access_token for facebook');
        this.get_facebook_access_token();
        if ( !this.timer ) this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        this.timer.initWithCallback( function() { // can be function, or nsITimerCallback
          if ( ldapInfoLog && ldapInfoFetchOther ) {
            ldapInfoLog.info('Timeout');
            ldapInfoFetchOther._fetchOtherInfo(callbackData);
          }
        }, 1000, Ci.nsITimer.TYPE_ONE_SHOT );
        return;
      }
      this.loadRemote(callbackData);
    } catch (err) {
      ldapInfoLog.logException(err);
      callbackData.cache.facebook._Status = ['Exception'];
      this.callBackAndRunNext(callbackData); // with failure
    }
  },
  
  loadRemote: function(callbackData) {
    try {
      let current = callbackData.tryURLs.shift();
      if ( typeof(current) == 'undefined' ) {
        return ldapInfoFetchOther.callBackAndRunNext(callbackData); // failure or try load all
      }
      if ( current[2] == 'Facebook' ) current[1] = current[1].replace('__UID__', callbackData.cache.facebook.id); // maybe not replace if get from FQL
      let isFacebookWebSearch = ( current[2] == 'FacebookWebSearch' );
      let isFacebookSearch = ( isFacebookWebSearch || current[2] == 'FacebookFQLSearch' || current[2] == 'FacebookSearch');
      if ( ( isFacebookSearch || current[2] == 'Facebook' ) && !ldapInfoUtil.options.load_from_facebook ) {
        callbackData.cache.facebook.state = ldapInfoUtil.STATE_INIT;
        return this.loadRemote(callbackData);
      }
      if ( isFacebookSearch ) current[1] = current[1].replace('__FACEBOOK__TOKEN__', ldapInfoUtil.options.facebook_token);
      ldapInfoLog.info('loadRemote ' + current[1]);
      
      if ( Services.io.offline ) {
        if ( !isFacebookSearch ) {
          callbackData.cache[current[3]].state = ldapInfoUtil.STATE_TEMP_ERROR;
          callbackData.cache[current[3]]._Status = [current[2] + " Offline"];
        }
        return this.loadRemote(callbackData);
      }
      
      let oReq = XMLHttpRequest();
      oReq.open("GET", current[1], true);
      //oReq.setRequestHeader('Referer', 'https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/');
      // cache control ?
      oReq.responseType = isFacebookWebSearch ? 'xhtml' : ( isFacebookSearch ? 'json' : 'arraybuffer' );
      oReq.timeout = ldapInfoUtil.options['ldapTimeoutInitial'] * 1000;
      oReq.withCredentials = true;
      oReq.onloadend = function() {
        oReq.onloadend = null;
        delete callbackData.req;
        let facebookWebToken;
        let success = ( oReq.status == "200" && oReq.response
                   && ( !isFacebookSearch
                     || ( isFacebookWebSearch && ( facebookWebToken = oReq.response.match(/<div class="instant_search_title[^"]*"><a href="https:\/\/www.facebook.com\/(\S+)"[^>]*>(.+?)<\/a><\/div>/) ) )
                     || ( isFacebookSearch && !isFacebookWebSearch && ( ( oReq.response instanceof(Array) && oReq.response[0] && oReq.response[0].username ) 
                                                                     || ( oReq.response.data && oReq.response.data[0] ) ) ) ) ) ? true : false;
        ldapInfoLog.info('XMLHttpRequest status ' + oReq.status + ":" + success);
        if ( !success && !isFacebookWebSearch && ( oReq.status == "200" || oReq.status == "403" ) ) ldapInfoLog.logObject(oReq.response,'oReq.response',1);
/*
oReq.response:
+ error (object) [object Object]
| + message (string) '(#200) Must have a valid access_token to access this endpoint'
| + type (string) 'OAuthException'
| + code (number) 200
| *
2013-11-04 22:00:29.076 oReq.response:
+ 0 (object) [object Object]
| + uid (string) '100668****'
| *
*/
        if ( success ) {
          if ( isFacebookSearch ) {
            if ( isFacebookWebSearch ) {
              callbackData.cache.facebook.name = [facebookWebToken[2]];
              callbackData.cache.facebook.id = [facebookWebToken[1]];
            } else {
              let entry = ( oReq.response instanceof(Array) ) ? oReq.response[0] : oReq.response.data[0];
              //callbackData.cache.facebook.name = [entry.name || entry.username || ''];
              callbackData.cache.facebook.id = [entry.username || entry.uid || entry.id];
              //callbackData.cache.facebook.uid = [entry.uid || ''];
              callbackData.cache.facebook.birthday = [entry.birthday_date || ''];
              callbackData.cache.facebook.relationship = [entry.relationship_status || ''];
              if ( entry.pic_big ) { // don't use uid to get avatar, use searched result
                callbackData.tryURLs[0][1] = entry.pic_big;
                ldapInfoLog.info('use pic_big: ' + entry.pic_big);
              }
            }
            callbackData.cache.facebook['Facebook Profile'] = ['https://www.facebook.com/' + callbackData.cache.facebook.id];
            delete callbackData.cache.facebook.id;
            ldapInfoFetchOther.loadRemote(callbackData);
          } else {
            if ( current[3] == 'google' ) callbackData.cache.google['Google Profile'] = ["https://profiles.google.com/" + callbackData.mailid];
            if ( current[3] == 'gravatar' ) callbackData.cache.gravatar['Gravatar Profile'] = ["http://www.gravatar.com/" + callbackData.gravatarHash];
            let type = oReq.getResponseHeader('Content-Type') || 'image/png'; // image/gif or application/json; charset=utf-8 or text/html; charset=utf-8
            let win = callbackData.win.get();
            if ( win && win.btoa ) {
              callbackData.cache[current[3]].src = "data:" + type + ";base64," + ldapInfoUtil.byteArray2Base64(win, oReq.response);
            }
            callbackData.cache[current[3]].state = ldapInfoUtil.STATE_DONE;
            callbackData.cache[current[3]]._Status = [current[2] + " \u2714"];
            if ( ldapInfoUtil.options.load_from_all_remote ) {
              ldapInfoFetchOther.loadRemote(callbackData);
            } else {
              ldapInfoFetchOther.callBackAndRunNext(callbackData); // success
            }
          }
        } else { // not success
          let addtionalErrMsg = "";
          let state = ldapInfoUtil.STATE_DONE;
          if ( isFacebookSearch ) {
            current = callbackData.tryURLs.shift();
            if ( isFacebookWebSearch ) {
              if ( oReq.response.match(/<div id="captcha" class="captcha"/) ) {
                addtionalErrMsg = " need captcha";
                state = ldapInfoUtil.STATE_TEMP_ERROR;
                Services.prefs.getBranch("extensions.ldapinfoshow.").setCharPref('facebook_token', "");
              } else if ( oReq.response.match(/Your account has been temporarily suspended/) ) {
                addtionalErrMsg = " account suspended";
                state = ldapInfoUtil.STATE_ERROR;
                ldapInfoFetchOther.disableFacebook();
              }
            } else if ( oReq.response && oReq.response.error_msg ) {
              addtionalErrMsg = " " + oReq.response.error_msg;
            } else if ( oReq.response && oReq.response.error && oReq.response.error.type ) {
              addtionalErrMsg = " " + oReq.response.error.type;
            }
          }
          callbackData.cache[current[3]].state = state;
          callbackData.cache[current[3]]._Status = [current[2] + addtionalErrMsg + " \u2718"];
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
  
  progressListener: {
    QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
    onLocationChange: function(aWebProgress, aRequest, aLocationURI, aFlags) {
      if ( aLocationURI.specIgnoringRef.indexOf(ldapInfoFetchOther.facebookRedirect) == 0 ) {
        ldapInfoFetchOther.getTokenFromURI(aLocationURI);
        let browser = ldapInfoFetchOther.queryingTab.ownerDocument.defaultView.getBrowser();
        browser.removeProgressListener(ldapInfoFetchOther.progressListener);
        browser.removeTab(ldapInfoFetchOther.queryingTab);
      }
    },
  },
  getTokenFromURI: function(aLocationURI) {
    // 'access_token=xxx&expires_in=5179267'
    let splitResult = /^access_token=(.+)&expires_in=(\d+)/.exec(aLocationURI.ref);
    if ( splitResult != null ) {
      let [, facebook_token, facebook_token_expire ] = splitResult;
      ldapInfoLog.info('token URI: ' + aLocationURI.ref);
      ldapInfoLog.info('token: ' + facebook_token + ":" + facebook_token_expire);
      if ( facebook_token_expire == 0 ) facebook_token_expire = 3600*24*365;
      facebook_token_expire = ( +facebook_token_expire + Math.round(Date.now()/1000) - 60 ) + "";
      let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
      branch.setCharPref('facebook_token', facebook_token); // will update ldapInfoUtil.options.facebook_token through the observer
      branch.setCharPref('facebook_token_expire', facebook_token_expire);
      // set all cookies to have long life
      let cookies = Services.cookies.getCookiesFromHost("facebook.com");
      while ( cookies.hasMoreElements() ) {
        let c = cookies.getNext();
        c.QueryInterface(Ci.nsICookie);
        c.QueryInterface(Ci.nsICookie2);
        let expire = Math.round(Date.now()/1000) + 3600*24*365*3; // 3 years
        Services.cookies.remove(c.host, c.name, c.path, /*block this*/false);
        Services.cookies.add(c.host, c.path, c.name, c.value, c.isSecure, c.isHttpOnly, /*is session*/false, expire);
      }
    }
  },
  queryingTab: null,
  get_facebook_access_token: function() {
    if ( this.queryingTab || ldapInfoUtil.options.facebook_token ) return;
    //let client= "client_id=437279149703221";
    let client= "client_id=243956650505"; // MOSC
    let scope = "";
    let redirect = "&redirect_uri=" + this.facebookRedirect;
    let type = "&response_type=token";
    let url = "https://www.facebook.com/dialog/oauth?" + client + scope + redirect + type;

    if ( ldapInfoUtil.isSeaMonkey ) {
      let xulWindow = Services.wm.getMostRecentWindow("navigator:browser");
      if ( !xulWindow ) { // open one and get it in next try
        return Services.ww.openWindow(null, "chrome://navigator/content/navigator.xul", "navigator:browser", null, null);
      }
      let browser = xulWindow.getBrowser();
      this.queryingTab = browser.loadOneTab(url, { inBackground: false });
      browser.addProgressListener(this.progressListener); // will add to browser.mProgressListeners
      browser.tabContainer.addEventListener("TabClose", this.seaMonkeyTabClose, false);
      return;
    }
    
    // Thunderbird
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if ( !mail3PaneWindow ) return this.disableFacebook();
    let tabmail = mail3PaneWindow.document.getElementById("tabmail");
    if ( !tabmail ) return this.disableFacebook();
    tabmail.registerTabMonitor(ldapInfoFetchOther.tabMonitor);
    mail3PaneWindow.focus();
    this.queryingTab = tabmail.openTab( "contentTab", { contentPage: url,
                                                        background: false,
                                                        onListener: function(browser, listener) { // aArgs.onListener(aTab.browser, aTab.progressListener);
                                                          ldapInfoFetchOther.hookedFunctions.push( ldapInfoaop.around( {target: listener, method: 'onLocationChange'}, function(invocation) {
                                                            let [, , aLocationURI, ] = invocation.arguments; // aWebProgress, aRequest, aLocationURI, aFlags
                                                            if ( aLocationURI.specIgnoringRef.indexOf(ldapInfoFetchOther.facebookRedirect) == 0 ) {
                                                              ldapInfoFetchOther.getTokenFromURI(aLocationURI);
                                                              ldapInfoFetchOther.unHook();
                                                              return tabmail.closeTab(ldapInfoFetchOther.queryingTab);
                                                            }
                                                            return invocation.proceed();;
                                                          })[0] );
                                                        }
    });
  },
  
  unHook: function() {
    this.hookedFunctions.forEach( function(hooked) {
      hooked.unweave();
    } );
    this.hookedFunctions = [];
  },
  
  disableFacebook: function() {
    ldapInfoLog.log("Get token failed, disabled facebook support", 1);
    let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
    branch.setBoolPref('load_from_facebook', false);
  },
  
  seaMonkeyTabClose: function(event) {
    if ( event.target === ldapInfoFetchOther.queryingTab ) {
      let browser = ldapInfoFetchOther.queryingTab.ownerDocument.defaultView.getBrowser();
      browser.tabContainer.removeEventListener("TabClose", ldapInfoFetchOther.seaMonkeyTabClose, false);
      if ( !ldapInfoUtil.options.facebook_token ) ldapInfoFetchOther.disableFacebook();
      ldapInfoFetchOther.queryingTab = null;
    }
  },
  
  tabMonitor: {
    monitorName: 'ldapinfoTabMonitor',
    onTabClosing: function(tab) {
      if ( !ldapInfoFetchOther ) return; // unload error
      if ( tab === ldapInfoFetchOther.queryingTab ) {
        let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        let tabmail = mail3PaneWindow.document.getElementById("tabmail");
        tabmail.unregisterTabMonitor(ldapInfoFetchOther.tabMonitor);
        if ( !ldapInfoUtil.options.facebook_token ) ldapInfoFetchOther.disableFacebook();
        ldapInfoFetchOther.queryingTab = null;
      }
    },
    onTabSwitched: function(tab) {},
    onTabTitleChanged: function(tab) {}
  },

}