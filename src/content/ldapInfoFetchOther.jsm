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
        callbackData.tryURLs.push(new this.loadRemoteBase(callbackData, 'Facebook', 'facebook', "https://graph.facebook.com/" + callbackData.cache.facebook.id + "/picture"));
      } else {
        callbackData.tryURLs.push(this.loadRemoteFacebookFQLSearch(callbackData)); // if success, picture will be unshift to the tryURLs
      }
    }
    if ( ldapInfoUtil.options.load_from_linkedin && ldapInfoUtil.options.linkedin_user && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.linkedin.state) >= 0) {
      callbackData.cache.linkedin.state = ldapInfoUtil.STATE_QUERYING;
      let URL = "https://outlook.linkedinlabs.com/osc/login";
      let passwd = "";
      if ( !ldapInfoUtil.options.linkedin_token ) {
        passwd = ldapInfoUtil.getPasswordForServer(URL, ldapInfoUtil.options.linkedin_user, false, null);
        if ( passwd ) callbackData.tryURLs.push(this.loadRemoteLinkedInToken(callbackData, URL, passwd));
      }
      if ( ldapInfoUtil.options.linkedin_token || passwd ) {
        //callbackData.tryURLs.push([callbackData.address, "http://linkedin.com/osc/people", "LinkedInSearch"]);
        //callbackData.tryURLs.push([callbackData.address, "LINKEDIN_PIC", "LinkedIn", "linkedin"]);
      }
    }
    if ( ldapInfoUtil.options.load_from_google && ["gmail.com", "googlemail.com"].indexOf(callbackData.mailDomain)>= 0 && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.google.state) >= 0) {
      callbackData.cache.google.state = ldapInfoUtil.STATE_QUERYING;
      callbackData.mailid = callbackData.mailid.replace(/\+.*/, '');
      callbackData.tryURLs.push(new this.loadRemoteBase(callbackData, 'Google', 'google', "https://profiles.google.com/s2/photos/profile/" + callbackData.mailid));
    } else callbackData.cache.google = { state: ldapInfoUtil.STATE_DONE, _Status: ['Google \u2718'] };
    if ( ldapInfoUtil.options.load_from_gravatar && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.gravatar.state) >= 0 ) {
      callbackData.cache.gravatar.state = ldapInfoUtil.STATE_QUERYING;
      callbackData.gravatarHash = GlodaUtils.md5HashString( callbackData.address );
      callbackData.tryURLs.push(new this.loadRemoteBase(callbackData, 'Gravatar', 'gravatar', 'http://www.gravatar.com/avatar/' + callbackData.gravatarHash + '?d=404'));
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
      this.loadNextRemote(callbackData);
    } catch (err) {
      ldapInfoLog.logException(err);
      callbackData.cache.facebook._Status = ['Exception'];
      this.callBackAndRunNext(callbackData); // with failure
    }
  },
  
  loadRemoteBase: function(callbackData, name, target, url) {
    let self = this; // new Object
    self.name = name;
    self.target = target;
    self.url = url;
    self.isSuccess = function(request) {
      return true;
    };
    self.WhenSuccess = function(request) {
      if ( self.target == 'google' ) callbackData.cache.google['Google Profile'] = ["https://profiles.google.com/" + callbackData.mailid];
      if ( self.target == 'gravatar' ) callbackData.cache.gravatar['Gravatar Profile'] = ["http://www.gravatar.com/" + callbackData.gravatarHash];
      let type = request.getResponseHeader('Content-Type') || 'image/png'; // image/gif or application/json; charset=utf-8 or text/html; charset=utf-8
      let win = callbackData.win.get();
      if ( win && win.btoa ) {
        callbackData.cache[self.target].src = "data:" + type + ";base64," + ldapInfoUtil.byteArray2Base64(win, request.response);
      }
    };
    self.addtionalErrMsg = "";
    self.WhenError = function(request) {
    };
    self.method = "GET";
    self.type = 'arraybuffer';
    self.isChained = false; // for FacebookFQLSearch etc, when success, will chain another request
    self.data = null;
    self.setRequestHeader = function(request) {
    };
    self.makeRequest = function() {
      let oReq = XMLHttpRequest();
      oReq.open(self.method, self.url, true);
      oReq.responseType = self.type;
      oReq.timeout = ldapInfoUtil.options['ldapTimeoutInitial'] * 1000;
      oReq.withCredentials = true;
      oReq.onloadend = function() {
        let request = this;
        ldapInfoLog.logObject(this,'this',1);
        ldapInfoLog.logObject(this.response,'this.response',1);
        request.onloadend = null;
        delete callbackData.req;
        let success = ( request.status == "200" && request.response ) && self.isSuccess(request);
        ldapInfoLog.info('XMLHttpRequest status ' + request.status + ":" + success);
        if ( success ) {
          self.WhenSuccess(request);
          if ( !self.isChained ) {
            callbackData.cache[self.target].state = ldapInfoUtil.STATE_DONE;
            callbackData.cache[self.target]._Status = [self.name + " \u2714"];
          }
          if ( ldapInfoUtil.options.load_from_all_remote || self.isChained ) {
            ldapInfoFetchOther.loadNextRemote(callbackData);
          } else {
            ldapInfoFetchOther.callBackAndRunNext(callbackData); // success
          }
        } else {
          if ( request.status == "200" || request.status == "403" ) ldapInfoLog.logObject(request.response,'request.response',1);
          self.WhenError(request);
          callbackData.cache[self.target].state = ldapInfoUtil.STATE_DONE;
          callbackData.cache[self.target]._Status = [self.name + self.addtionalErrMsg + " \u2718"];
          ldapInfoFetchOther.loadNextRemote(callbackData);
        }
        request.abort(); // without abort, when disable add-on, it takes quite a while to unload this js module
      };
      callbackData.req = oReq; // only the latest request will be saved for later possible abort
      self.setRequestHeader(oReq);
      oReq.send(self.data);
    };
  },
  
  loadRemoteFacebookFQLSearch: function(callbackData) {
    let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'Facebook', 'facebook');
    self.type = 'json';
    self.isChained = true;
    let query = "SELECT username,birthday_date,relationship_status,pic_big FROM user WHERE uid IN ( SELECT uid FROM email WHERE email='" + ldapInfoUtil.crc32md5(callbackData.address) + "' )";
    self.url = "https://api.facebook.com/method/fql.query?format=json&access_token=" + ldapInfoUtil.options.facebook_token + "&query=" + query;
    self.isSuccess = function(request) {
      return ( request.response instanceof(Array) && request.response[0] && request.response[0].username );
    };
    self.WhenSuccess = function(request) {
      let entry = request.response[0];
      let id = entry.username || entry.uid;
      callbackData.cache.facebook.birthday = [entry.birthday_date || ''];
      callbackData.cache.facebook.relationship = [entry.relationship_status || ''];
      let picURL = "https://graph.facebook.com/" + id + "/picture";
      if ( entry.pic_big ) { // don't use uid to get avatar, use searched result
        ldapInfoLog.info('use pic_big: ' + entry.pic_big);
        picURL = entry.pic_big;
      }
      callbackData.tryURLs.unshift(new ldapInfoFetchOther.loadRemoteBase(callbackData, 'Facebook', 'facebook', picURL));
      callbackData.cache.facebook['Facebook Profile'] = ['https://www.facebook.com/' + id];
    };
    self.WhenError = function(request) {
      if ( request.response && request.response.error_msg ) self.addtionalErrMsg = " " + request.response.error_msg;
    };
    return self;
  },
  
  loadRemoteLinkedInToken: function(callbackData, url, passwd) {
    let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', url);
    self.type = 'text';
    self.method = "POST";
    self.isChained = true;
    self.data = "key=" + encodeURIComponent(ldapInfoUtil.options.linkedin_user) + "&pw=" + encodeURIComponent(passwd);
    self.setRequestHeader = function(request) {
      request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    };
    self.isSuccess = function(request) {
      return request.responseText;
    };
    self.WhenSuccess = function(request) {
      let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
      branch.setCharPref('linkedin_token', request.responseText);
      callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteLinkedInSearch(callbackData));
    };
    self.WhenError = function(request) {
      if ( request.statusText ) self.addtionalErrMsg = " " + request.statusText;
    };
    return self;
  },
  
  loadRemoteLinkedInSearch: function(callbackData, url, passwd) {
    //let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', url);
    //self.method = "POST";
    //self.setRequestHeader = function(request) {
    return self;
  },
  
  loadNextRemote: function(callbackData) {
    try {
      ldapInfoLog.logObject(callbackData.tryURLs,'tryURLs',1);
      let current = callbackData.tryURLs.shift();
      ldapInfoLog.logObject(current,'current',1);
      if ( typeof(current) == 'undefined' ) return ldapInfoFetchOther.callBackAndRunNext(callbackData); // failure or try load all
      if ( current.target == 'facebook' && !ldapInfoUtil.options.load_from_facebook ) {
        callbackData.cache.facebook.state = ldapInfoUtil.STATE_INIT;
        return this.loadNextRemote(callbackData);
      }
      ldapInfoLog.info('loadNextRemote for ' + callbackData.address + " : " + current.url);
      if ( Services.io.offline ) {
        callbackData.cache[current.target].state = ldapInfoUtil.STATE_TEMP_ERROR;
        callbackData.cache[current.target]._Status = [current.name + " Offline"];
        return this.loadNextRemote(callbackData);
      }
      return current.makeRequest();
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