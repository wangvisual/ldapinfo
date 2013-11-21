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
  requestTimer: null,
  batchCache: {},
  facebookRedirect: 'https://www.facebook.com/connect/login_success.html',
  
  clearCache: function () {
    this.currentAddress = null;
    this.batchCache = {};
  },
  
  cleanup: function() {
    try {
      ldapInfoLog.info("ldapInfoFetchOther cleanup");
      if ( this.timer ) {
        this.timer.cancel();
        this.timer = null;
      }
      if ( this.requestTimer ) {
        this.requestTimer.cancel();
        this.requestTimer = null;
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
      this.batchCache = {};
    }
  },
  
  getLinkedInToken: function(callbackData, jump) {
    let URL = "https://outlook.linkedinlabs.com/osc/login";
    let passwd = ldapInfoUtil.getPasswordForServer(URL, ldapInfoUtil.options.linkedin_user, false, null);
    if ( passwd ) {
      if (jump) { // cut in line
        callbackData.tryURLs.unshift(this.loadRemoteLinkedInToken(callbackData, URL, passwd));
      } else {
        callbackData.tryURLs.push(this.loadRemoteLinkedInToken(callbackData, URL, passwd)); // when get token, if already got one, maybe skipped and unshift search
      }
    } else {
      ldapInfoLog.log("Get password for LinkedIn user " + ldapInfoUtil.options.linkedin_user + " failed, disabled LinkedIn support", 1);
      ldapInfoUtil.prefs.setBoolPref('load_from_linkedin', false);
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
      if ( !ldapInfoUtil.options.linkedin_token ) {
        this.getLinkedInToken(callbackData, false);
      } else {
        callbackData.tryURLs.push(this.loadRemoteLinkedInSearch(callbackData));
      }
    }
    if ( ldapInfoUtil.options.load_from_flickr && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.flickr.state) >= 0 ) {
      callbackData.cache.flickr.state = ldapInfoUtil.STATE_QUERYING;
      callbackData.tryURLs.push(this.loadRemoteFlickrSearch(callbackData));
    }
    if ( ldapInfoUtil.options.load_from_google && ["gmail.com", "googlemail.com"].indexOf(callbackData.mailDomain)>= 0 && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.google.state) >= 0) {
      callbackData.cache.google.state = ldapInfoUtil.STATE_QUERYING;
      callbackData.mailid = callbackData.mailid.replace(/\+.*/, '');
      callbackData.tryURLs.push(new this.loadRemoteBase(callbackData, 'Google', 'google', "https://profiles.google.com/s2/photos/profile/" + callbackData.mailid));
    } else callbackData.cache.google = { state: ldapInfoUtil.STATE_DONE, _Status: ['Google ' + ldapInfoUtil.CHAR_NOUSER] };
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
        ldapInfoUtil.options.facebook_token = "";
        ldapInfoUtil.prefs.setCharPref('facebook_token', "");
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
    self.isSuccess = function(request) { return true; };
    self.WhenSuccess = function(request) {
      if ( self.target == 'google' ) callbackData.cache.google['Google Profile'] = ["https://profiles.google.com/" + callbackData.mailid];
      if ( self.target == 'gravatar' ) callbackData.cache.gravatar['Gravatar Profile'] = ["http://www.gravatar.com/" + callbackData.gravatarHash];
      let type = request.getResponseHeader('Content-Type') || 'image/png'; // image/gif or application/json; charset=utf-8 or text/html; charset=utf-8
      let win = callbackData.win.get();
      if ( win && win.btoa && type != 'text/xml' && request.response ) {
        callbackData.cache[self.target].src = "data:" + type + ";base64," + ldapInfoUtil.byteArray2Base64(win, request.response);
      }
    };
    self.addtionalErrMsg = "";
    self.badCert = false;
    self.WhenError = function(request) {};
    self.method = "GET";
    self.type = 'arraybuffer';
    self.isChained = false; // for FacebookFQLSearch etc, when success, will chain another request
    self.data = null;
    self.setRequestHeader = function(request) { };
    self.beforeRequest = function() { return true; };
    self.makeRequest = function() {
      if ( !self.beforeRequest() ) return;
      ldapInfoLog.info("URL:" + self.url);
      let oReq = XMLHttpRequest();
      oReq.open(self.method, self.url, true);
      oReq.responseType = self.type;
      oReq.timeout = ldapInfoUtil.options['ldapTimeoutInitial'] * 1000;
      oReq.withCredentials = true;
      oReq.addEventListener("error", function(e) {
        callbackData.cache[self.target].state = ldapInfoUtil.STATE_TEMP_ERROR;
        let status = this.channel.QueryInterface(Ci.nsIRequest).status;
        if ((status & 0xff0000) === 0x5a0000) { // Security module
          self.addtionalErrMsg += ' Security Error';
          self.badCert = true;
        } else { // Network
          switch (status) {
            case 0x804B000C: // NS_ERROR_CONNECTION_REFUSED, network(13)
              self.addtionalErrMsg += ' ConnectionRefusedError';
              break;
            case 0x804B000E: // NS_ERROR_NET_TIMEOUT, network(14)
              self.addtionalErrMsg += ' NetworkTimeoutError';
              break;
            case 0x804B001E: // NS_ERROR_UNKNOWN_HOST, network(30)
              self.addtionalErrMsg += 'DomainNotFoundError';
              break;
            case 0x804B0047: // NS_ERROR_NET_INTERRUPT, network(71)
              self.addtionalErrMsg += 'NetworkInterruptError';
              break;
            default:
              self.addtionalErrMsg += 'NetworkError';
              break;
          }
        }
      }, false);
      oReq.addEventListener("loadend", function(e) {
        let request = this;
        delete callbackData.req;
        let success = ( request.status == "200" && request.response ) && self.isSuccess(request);
        ldapInfoLog.info('XMLHttpRequest status ' + request.status + ":" + success);
        if ( success ) {
          self.WhenSuccess(request);
          if ( !self.isChained ) {
            callbackData.cache[self.target].state = ldapInfoUtil.STATE_DONE;
            callbackData.cache[self.target]._Status = [self.name + ' ' + ( callbackData.cache[self.target].src ? ldapInfoUtil.CHAR_HAVEPIC : ldapInfoUtil.CHAR_NOPIC )];
          }
          if ( ldapInfoUtil.options.load_from_all_remote || self.isChained ) {
            ldapInfoFetchOther.loadNextRemote(callbackData);
          } else {
            ldapInfoFetchOther.callBackAndRunNext(callbackData); // success
          }
        } else {
          if ( ( request.status == "200" || request.status == "403" ) && self.type != 'document' ) ldapInfoLog.logObject(request.response,'request.response',1);
          if ( callbackData.cache[self.target].state < ldapInfoUtil.STATE_DONE ) callbackData.cache[self.target].state = ldapInfoUtil.STATE_DONE;
          if ( request.status != 200 && request.status!= 404 ) {
            if ( request.response && request.response.error_msg ) {
              self.addtionalErrMsg += " " + request.response.error_msg;
            } else if ( request.statusText ) self.addtionalErrMsg += " " + request.statusText;
          }
          self.WhenError(request);
          callbackData.cache[self.target]._Status = [self.name + self.addtionalErrMsg + " " + ldapInfoUtil.CHAR_NOUSER];
          ldapInfoFetchOther.loadNextRemote(callbackData);
        }
        request.abort(); // without abort, when disable add-on, it takes quite a while to unload this js module
      }, false);
      callbackData.req = oReq; // only the latest request will be saved for later possible abort
      self.setRequestHeader(oReq);
      oReq.send(self.data);
    };
  },
  
  loadRemoteFacebookFQLSearch: function(callbackData) {
    let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'Facebook', 'facebook');
    self.type = 'json';
    self.isChained = true;
    self.batchAddresses = [];
    self.beforeRequest = function() {
      let batch = ldapInfoFetchOther.batchCache[callbackData.address];
      if ( batch ) { // already in cache
        ldapInfoLog.logObject(batch.cache,'batch.cache',2);
        if ( batch.cache.facebook.id ) { // and found
          self.WhenSuccess(null);
        } else {
          callbackData.cache[self.target]._Status = [self.name + self.addtionalErrMsg + " " + ldapInfoUtil.CHAR_NOUSER];
        }
        ldapInfoFetchOther.loadNextRemote(callbackData);
        return false;
      }
      let hashes = []; let count = 0;
      ldapInfoFetchOther.queue.every( function(args) {
        if ( !args[0].cache.facebook['Facebook Profile'] && !ldapInfoFetchOther.batchCache[args[0].address] ) {
          ldapInfoFetchOther.batchCache[args[0].address] = { cache: args[0].cache };
          hashes.push("'" + ldapInfoUtil.crc32md5(args[0].address) + "'");
          self.batchAddresses.push(args[0].address);
          count ++;
        }
        return count >= 25 ? false : true; // query length LIMIT for IE is around 2048, so the count should be less than 28
      } );
      let query = '{"query1": "SELECT uid, email FROM email WHERE email IN( ' + hashes.join(', ') + ' )", "query2": "SELECT uid,username,birthday_date,relationship_status,pic_big_with_logo FROM user WHERE uid IN ( SELECT uid from #query1 )"}';
      self.url = "https://api.facebook.com/method/fql.multiquery?format=json&access_token=" + ldapInfoUtil.options.facebook_token + "&queries=" + encodeURIComponent(query);
      return true;
    };
    self.isSuccess = function(request) {
      if ( !request.response instanceof(Array) || !request.response[0] || request.response[0].name != 'query1' ) return false;
      let success = false;
      let query1 = request.response[0].fql_result_set;
      let query2 = request.response[1].fql_result_set;
      ldapInfoLog.logObject(query1,'query1',2);
      ldapInfoLog.logObject(query2,'query2',2);
      let uid2address = {};
      for ( let i = 0; i < query1.length; i++ ) {
        if ( query1[i].uid ) uid2address[query1[i].uid] = self.batchAddresses[i];
      }
      ldapInfoLog.logObject(uid2address,'uid2address',2);
      query2.forEach( function(entry){
        let address = uid2address[entry.uid || ''];
        if ( !address ) return;
        ldapInfoLog.logObject(address,'address',2);
        let cache = ldapInfoFetchOther.batchCache[address].cache;
        cache.facebook.id = [entry.username || entry.uid];
        cache.facebook.birthday = [entry.birthday_date || ''];
        cache.facebook.relationship = [entry.relationship_status || ''];
        cache.facebook.picURL = ["https://graph.facebook.com/" + cache.facebook.id[0] + "/picture"];
        if ( entry.pic_big_with_logo ) { // don't use uid to get avatar, use searched result
          cache.facebook.picURL = [entry.pic_big_with_logo];
        }
        if ( address == callbackData.adderess ) success = true;
      } );
      return success;
    };
    self.WhenSuccess = function(request) {
      callbackData.tryURLs.unshift(new ldapInfoFetchOther.loadRemoteBase(callbackData, 'Facebook', 'facebook', callbackData.cache.facebook.picURL[0]));
      callbackData.cache.facebook['Facebook Profile'] = ['https://www.facebook.com/' + callbackData.cache.facebook.id[0]];
      delete callbackData.cache.facebook.id;
      delete callbackData.cache.facebook.picURL;
    };
    return self;
  },
  
  loadRemoteLinkedInToken: function(callbackData, url, passwd) {
    let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', url);
    self.type = 'text';
    self.method = "POST";
    self.isChained = true;
    self.data = "key=" + encodeURIComponent(ldapInfoUtil.options.linkedin_user) + "&pw=" + encodeURIComponent(passwd);
    self.beforeRequest = function() {
      if ( ldapInfoUtil.options.linkedin_token ) { // got one, maybe in another turn
        callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteLinkedInSearch(callbackData));
        ldapInfoFetchOther.loadNextRemote(callbackData);
        return false; // skip get token
      } else {
        return true;
      }
    };
    self.setRequestHeader = function(request) {
      request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    };
    self.isSuccess = function(request) {
      return request.responseText;
    };
    self.WhenSuccess = function(request) {
      ldapInfoUtil.prefs.setCharPref('linkedin_token', request.responseText.replace(/[^\w\-@]/g, ''));
      callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteLinkedInSearch(callbackData));
    };
    self.WhenError = function(request) {
      if (self.badCert) {
        let win = callbackData.win.get();
        if ( win && win.document ) {
          let strBundle = Services.strings.createBundle('chrome://ldapInfo/locale/ldapinfoshow.properties');
          let result = Services.prompt.confirm(win, strBundle.GetStringFromName("prompt.warning"), strBundle.GetStringFromName("prompt.confirm.linkedin.cert"));
          let args = {location: "https://outlook.linkedinlabs.com", prefetchCert: true};
          if ( result ) win.openDialog("chrome://pippki/content/exceptionDialog.xul", "Opt", "chrome,dialog,modal", args);
          if ( !result || !args.exceptionAdded ) {
            ldapInfoLog.log("Disable LinkedIn support.", 1);
            ldapInfoUtil.prefs.setBoolPref('load_from_linkedin', false);
          } else {
            ldapInfoLog.log("Retry to get LinkedIn token.", 1);
            ldapInfoFetchOther.getLinkedInToken(callbackData, true);
          }
        }
      } else {
        ldapInfoLog.log("Password error for LinkedIn user " + ldapInfoUtil.options.linkedin_user + ", Reset LinkedIn password!", "ERROR!");
        self.addtionalErrMsg += " Login Error";
        ldapInfoUtil.getPasswordForServer("https://outlook.linkedinlabs.com/osc/login", ldapInfoUtil.options.linkedin_user, "REMOVE", null);
        ldapInfoFetchOther.getLinkedInToken(callbackData, true);
      }
    };
    return self;
  },
  
  loadRemoteLinkedInSearch: function(callbackData) {
    let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', "https://outlook.linkedinlabs.com/osc/people/details");
    self.method = "POST";
    self.type = 'document';
    self.beforeRequest = function() {
      return ldapInfoUtil.options.load_from_linkedin && ldapInfoUtil.options.linkedin_token; // token reset ?
    };
    self.setRequestHeader = function(request) {
      let t = (new Date()).getTime(); // + OAuth.timeCorrectionMsec;
      t = Math.floor(t / 1000);
      request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      request.setRequestHeader('LSC-Timestamp', t);
      request.setRequestHeader('LSC-Token', ldapInfoUtil.options.linkedin_token);
      request.setRequestHeader('LSC-Auth', ldapInfoUtil.options.linkedin_token);
      request.setRequestHeader('LSC-Signature', ldapInfoUtil.b64_hmac_sha1(encodeURIComponent("POST/osc/people/details" + ldapInfoUtil.options.linkedin_token + t)));
    };
    self.data = "hashes=" + encodeURIComponent("<hashedAddresses>\n<personAddresses index='0'>\n<hashedAddress>"
                                             + ldapInfoUtil.crc32md5(callbackData.address)
                                             + "</hashedAddress>\n</personAddresses>\n</hashedAddresses>\n")
                          + "&ver=15.4420";
    self.isSuccess = function(request) {
      let xmlDoc = request.responseXML;
      // friends => person[] => userID, fullName, title, webProfilePage, index, <pictureUrl>, <friendStatus>
      //let nsResolver = xmlDoc.createNSResolver( xmlDoc.ownerDocument == null ? xmlDoc.documentElement : xmlDoc.ownerDocument.documentElement);
      //let persons = xmlDoc.evaluate('//person', xmlDoc, nsResolver, Ci.nsIDOMXPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
      if ( !xmlDoc || !xmlDoc.documentElement ) return false;
      let persons = xmlDoc.documentElement.childNodes;
      for (let i = 0; i < persons.length; i++) {
        let person = persons[i];
        if ( person.tagName != 'person' ) continue;
        let found = false;
        for ( let p of person.children ) {
          if ( p.tagName == 'index' && p.textContent == '0' ) found = true;
        }
        if ( found ) {
          for ( let p of person.children ) {
            if ( ['fullName', 'title', 'webProfilePage', 'friendStatus', 'pictureUrl'].indexOf(p.tagName) >= 0 && p.textContent ) {
              let name = p.tagName;
              if ( p.tagName == 'webProfilePage' ) name = 'LinkedIn Profile';
              if ( p.tagName == 'fullName' ) name = 'Name';
              callbackData.cache.linkedin[name] = [p.textContent];
            }
          }
          if ( callbackData.cache.linkedin.pictureUrl && callbackData.cache.linkedin.pictureUrl[0] ) {
            self.isChained = true;
            callbackData.tryURLs.unshift(new ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', callbackData.cache.linkedin.pictureUrl[0]));
            delete callbackData.cache.linkedin.pictureUrl;
          }
          return true;
        }
      }
      ldapInfoLog.info("Can't find, innerHTML:" + xmlDoc.documentElement.innerHTML);
      return false;
    };
    self.WhenError = function(request) {
      if ( request.status == 401 ) {
        ldapInfoLog.log("LinkedIn token error, Reset LinkedIn token!", 1);
        ldapInfoUtil.prefs.setCharPref('linkedin_token', '');
      }
    };
    return self;
  },
  
  loadRemoteFlickrSearch: function(callbackData) {
    // http://www.flickr.com/services/api/flickr.people.findByEmail.html
    let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'Flickr', 'flickr',
      "https://api.flickr.com/services/rest/?format=json&nojsoncallback=1&api_key=870e9bd1d96332b8e128b9772531b292&method=flickr.people.findByEmail&find_email=" + callbackData.address);
    self.type = 'json';
/*+ user (object) [object Object]
| + id (string) 'foo@N06'
| + nsid (string) 'foo@N06'
| + username (object) [object Object]
| *
+ stat (string) 'ok'
*/
    self.isSuccess = function(request) {
      let response = request.response;
      return ( response && response.user && response.user.nsid && response.stat == 'ok' );
    }
    self.WhenSuccess = function(request) {
      self.isChained = true;
      callbackData.cache.flickr.nsid = [request.response.user.nsid];
      callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteFlickrGetInfo(callbackData));
    };
    return self;
  },
  
  loadRemoteFlickrGetInfo: function(callbackData) {
    let self = new ldapInfoFetchOther.loadRemoteBase(callbackData, 'Flickr', 'flickr',
      "https://api.flickr.com/services/rest/?format=json&nojsoncallback=1&api_key=870e9bd1d96332b8e128b9772531b292&method=flickr.people.getInfo&user_id=" + callbackData.cache.flickr.nsid[0]);
    self.type = 'json';
/*+ person (object) [object Object]
| + id (string) 'foo@N06'
| + nsid (string) 'foo@N06'
| + ispro (number) 0
| + iconserver (string) '0'
| + iconfarm (number) 0
| + path_alias (object) null
| + username (object) [object Object]
| + realname (object) [object Object]
| + location (object) [object Object]
| + description (object) [object Object]
| + photosurl (object) [object Object]
| + profileurl (object) [object Object]
| + mobileurl (object) [object Object]
| + photos (object) [object Object]
| *
+ stat (string) 'ok'
*/
    self.isSuccess = function(request) {
      let response = request.response;
      return ( response && response.person && response.stat == 'ok' );
    }
    self.WhenSuccess = function(request) {
      let person = request.response.person;
      callbackData.cache.flickr['Flickr Profile'] = [person.profileurl._content];
      callbackData.cache.flickr['Name'] = [person.realname._content || person.username._content];
      if ( person.iconserver > 0 ) {
        self.isChained = true;
        callbackData.tryURLs.unshift(new ldapInfoFetchOther.loadRemoteBase(callbackData, 'Flickr', 'flickr',
          'http://farm' + person['icon-farm'] + '.staticflickr.com/' + person['icon-server'] + '/buddyicons/' + callbackData.cache.flickr.nsid + '.jpg'));
      }
      delete callbackData.cache.flickr.nsid;
    };
    return self;
  },
  
  loadNextRemote: function(callbackData) {
    try {
      let current = callbackData.tryURLs.shift();
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
      if ( !this.RequestTimer ) this.RequestTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      this.RequestTimer.initWithCallback( function() { // make it async
        if ( ldapInfoLog && ldapInfoFetchOther ) {
          return current.makeRequest();
        }
      }, 10, Ci.nsITimer.TYPE_ONE_SHOT );
      //return current.makeRequest();
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
      ldapInfoUtil.prefs.setCharPref('facebook_token', facebook_token); // will update ldapInfoUtil.options.facebook_token through the observer
      ldapInfoUtil.prefs.setCharPref('facebook_token_expire', facebook_token_expire);
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
    ldapInfoUtil.prefs.setBoolPref('load_from_facebook', false);
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