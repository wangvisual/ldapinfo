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
Cu.import("chrome://ldapInfo/content/ldapInfoLoadRemoteBase.jsm");

let ldapInfoFetchOther =  {
  queue: [], // request queue
  currentAddress: '',
  hookedFunctions: [],
  timer: null,
  requestTimer: null,
  batchCacheFacebook: {},
  batchCacheLinkedIn: {},
  facebookRedirect: 'https://www.facebook.com/connect/login_success.html',
  
  clearCache: function () {
    this.currentAddress = '';
    this.batchCacheFacebook = {};
    this.batchCacheLinkedIn = {};
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
      self._fetchOtherInfo.apply(ldapInfoFetchOther, ldapInfoFetchOther.queue[0]);
    } else {
      self.currentAddress = '';
      self.batchCacheFacebook = {};
      self.batchCacheLinkedIn = {};
    }
  },
  
  getLinkedInToken: function(callbackData, jump) {
    if ( !ldapInfoUtil.options.load_from_linkedin ) ldapInfoFetchOther.loadNextRemote(callbackData);
    let URL = "https://outlook.linkedinlabs.com/osc/login";
    let passwd = ldapInfoUtil.getPasswordForServer(URL, ldapInfoUtil.options.linkedin_user, false, null);
    if ( passwd ) {
      if (jump) { // make loadRemoteLinkedInToken the next request instead of last one
        callbackData.tryURLs.unshift(this.loadRemoteLinkedInToken(callbackData, URL, passwd));
      } else {
        callbackData.tryURLs.push(this.loadRemoteLinkedInToken(callbackData, URL, passwd)); // when get token, if already got one, maybe skipped and unshift search
      }
    } else {
      ldapInfoLog.log("Get password for LinkedIn user " + ldapInfoUtil.options.linkedin_user + " failed, disabled LinkedIn support", 1);
      ldapInfoUtil.prefs.setBoolPref('load_from_linkedin', false);
      ldapInfoUtil.options.load_from_linkedin = false; // so it take affects immediately
    }
  },
  
  queueFetchOtherInfo: function(...theArgs) {
    this.queue.push(theArgs);
    let callbackData = theArgs[0];
    ldapInfoLog.info('queueFetchOtherInfo ' + callbackData.address);
    callbackData.tryURLs = [];
    if ( ldapInfoUtil.options.load_from_facebook && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.facebook.state) >= 0 ) { // maybe ignored if user later cancel oAuth
      callbackData.cache.facebook.state = ldapInfoUtil.STATE_QUERYING;
      if ( callbackData.mailDomain == "facebook.com" ) {
        callbackData.cache.facebook.id = [callbackData.mailid];
        callbackData.cache.facebook['Facebook Profile'] = ['https://www.facebook.com/' + callbackData.mailid];
        callbackData.tryURLs.push(this.loadRemoteBase(callbackData, 'Facebook', 'facebook', "https://graph.facebook.com/" + callbackData.cache.facebook.id + "/picture"));
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
    if ( ldapInfoUtil.options.load_from_google ) {
      if ( ["gmail.com", "googlemail.com"].indexOf(callbackData.mailDomain)>= 0 ) {
        if ( [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.google.state) >= 0 ) {
          callbackData.cache.google.state = ldapInfoUtil.STATE_QUERYING;
          callbackData.mailid = callbackData.mailid.replace(/\+.*/, '');
          callbackData.tryURLs.push(this.loadRemoteBase(callbackData, 'Google', 'google', "https://profiles.google.com/s2/photos/profile/" + callbackData.mailid));
        }
      } else callbackData.cache.google = { state: ldapInfoUtil.STATE_DONE, _Status: ['Google ' + ldapInfoUtil.CHAR_NOUSER] };
    }
    if ( ldapInfoUtil.options.load_from_gravatar && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.gravatar.state) >= 0 ) {
      callbackData.cache.gravatar.state = ldapInfoUtil.STATE_QUERYING;
      callbackData.gravatarHash = GlodaUtils.md5HashString( callbackData.address );
      callbackData.tryURLs.push(this.loadRemoteBase(callbackData, 'Gravatar', 'gravatar', 'https://secure.gravatar.com/avatar/' + callbackData.gravatarHash + '?d=404'));
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
        return this.timer.initWithCallback( function() { // can be function, or nsITimerCallback
          if ( ldapInfoLog && ldapInfoFetchOther ) ldapInfoFetchOther._fetchOtherInfo(callbackData);
        }, 1000, Ci.nsITimer.TYPE_ONE_SHOT );
      }
      this.loadNextRemote(callbackData);
    } catch (err) {
      ldapInfoLog.logException(err);
      callbackData.cache.facebook._Status = ['Exception'];
      this.callBackAndRunNext(callbackData); // with failure
    }
  },
  
  loadRemoteBase: function(callbackData, name, target, url) {
    return new ldapInfoLoadRemoteBase(callbackData, name, target, url, self.loadNextRemote);
  },

  loadRemoteFacebookFQLSearch: function(callbackData) {
    let self = ldapInfoFetchOther.loadRemoteBase(callbackData, 'Facebook', 'facebook');
    self.type = 'json';
    self.method = "POST";
    self.batchAddresses = {};
    self.batchHashes = {};
    self.beforeRequest = function() {
      let batch = ldapInfoFetchOther.batchCacheFacebook[callbackData.address];
      if ( batch ) { // already in cache
        let id = batch.cache.facebook.id; // batch.cache.facebook.id will be deleted in self.WhenSuccess 
        if ( id ) self.WhenSuccess(null);
        self.AfterSuccess(id);
        return false;
      }
      let count = 0;
      ldapInfoFetchOther.queue.every( function(args) {
        if ( !args[0].cache.facebook['Facebook Profile'] && !ldapInfoFetchOther.batchCacheFacebook[args[0].address] ) {
          ldapInfoFetchOther.batchCacheFacebook[args[0].address] = { cache: args[0].cache };
          let hash = ldapInfoUtil.crc32md5(args[0].address);
          self.batchAddresses[args[0].address] = hash;
          self.batchHashes[hash] = args[0].address;
          count ++;
        }
        return count < 25; // query length LIMIT for IE is around 2048, so the count should be less than 28
      } );
      ldapInfoLog.info("loadRemoteFacebookFQLSearch addresses: " + Object.keys(self.batchAddresses).join(", "));
      let query = '{"query1": "SELECT uid, email FROM email WHERE email IN( \'' + Object.keys(self.batchHashes).join("', '") + '\' )",'
                + '"query2": "SELECT uid, username, birthday_date, relationship_status, pic_big_with_logo FROM user WHERE uid IN ( SELECT uid from #query1 )",'
                + '"query3": "SELECT id, url, is_silhouette FROM profile_pic WHERE id IN ( SELECT uid from #query1 ) AND width=20000"}';
      self.url = "https://api.facebook.com/method/fql.multiquery";
      self.data = "format=json&access_token=" + ldapInfoUtil.options.facebook_token + "&queries=" + encodeURIComponent(query);
      return true;
    };
    self.isSuccess = function(request) {
      if ( !request.response instanceof(Array) || !request.response[0] || request.response[0].name != 'query1' ) return false;
      let success = false;
      let query1 = request.response[0].fql_result_set;
      let query2 = request.response[1].fql_result_set;
      let query3 = request.response[2].fql_result_set;
      let uid2address = {};
      for ( let i = 0; i < query1.length; i++ ) {
        if ( query1[i].uid ) uid2address[query1[i].uid] = self.batchHashes[query1[i].email];
      }
      query2.forEach( function(entry){
        let address = uid2address[entry.uid || ''];
        if ( !address ) return;
        let cache = ldapInfoFetchOther.batchCacheFacebook[address].cache;
        cache.facebook.id = [entry.username || entry.uid];
        cache.facebook.birthday = [entry.birthday_date || ''];
        cache.facebook.relationship = [entry.relationship_status || ''];
        cache.facebook.picURL = ["https://graph.facebook.com/" + cache.facebook.id[0] + "/picture"];
        if ( entry.pic_big_with_logo ) { // don't use uid to get avatar, use searched result
          cache.facebook.picURL = [entry.pic_big_with_logo];
        }
        if ( address == callbackData.address ) success = true;
      } );
      query3.forEach( function(entry){
        let address = uid2address[entry.id || ''];
        if ( !address ) return;
        let cache = ldapInfoFetchOther.batchCacheFacebook[address].cache;
        // the user has default facebook avatar
        if ( entry.is_silhouette && ldapInfoUtil.options.ignore_facebook_default ) delete cache.facebook.picURL;
        if ( !entry.is_silhouette ) cache.facebook["Original Avatar"] = [entry.url];
      } );
      return success;
    };
    self.WhenSuccess = function(request) {
      callbackData.cache.facebook['Facebook Profile'] = ['https://www.facebook.com/' + callbackData.cache.facebook.id[0]];
      delete callbackData.cache.facebook.id;
      if ( callbackData.cache.facebook.picURL ) {
        self.isChained = true;
        callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteBase(callbackData, 'Facebook', 'facebook', callbackData.cache.facebook.picURL[0]));
        delete callbackData.cache.facebook.picURL;
      }
    };
    self.WhenError = function(request, type, retry) {
      if ( request.response && request.response.error_code && [100, 101, 102, 104, 105, 144, 190].indexOf(request.response.error_code) >= 0 ) {
        ldapInfoLog.info(self.addtionalErrMsg, 1);
        ldapInfoUtil.options.facebook_token = "";
        ldapInfoUtil.prefs.setCharPref('facebook_token', "");
        ldapInfoFetchOther.batchCacheFacebook = {};
      } else if ( callbackData.cache[self.target].state == ldapInfoUtil.STATE_TEMP_ERROR ) {
        ldapInfoFetchOther.batchCacheFacebook = {};
      }
    };
    return self;
  },
  
  loadRemoteLinkedInToken: function(callbackData, url, passwd) {
    let self = ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', url);
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
    self.WhenError = function(request, type, retry) {
      if ( self.badCert ) {
        if (retry) {
          ldapInfoLog.log("Retry to get LinkedIn token.", 1);
          ldapInfoFetchOther.getLinkedInToken(callbackData, true);
        }
      } else {
        ldapInfoLog.log("Password error for LinkedIn user " + ldapInfoUtil.options.linkedin_user + ", Please input LinkedIn password again!", "ERROR!");
        self.addtionalErrMsg += " Login Error";
        ldapInfoUtil.getPasswordForServer("https://outlook.linkedinlabs.com/osc/login", ldapInfoUtil.options.linkedin_user, "REMOVE", null);
        ldapInfoFetchOther.getLinkedInToken(callbackData, true);
      }
    };
    return self;
  },
  
  loadRemoteLinkedInSearch: function(callbackData) {
    let self = ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', "https://outlook.linkedinlabs.com/osc/people/details");
    self.method = "POST";
    self.type = 'document';
    self.batchAddresses = [];
    self.beforeRequest = function() {
      if ( !ldapInfoUtil.options.load_from_linkedin || !ldapInfoUtil.options.linkedin_token ) return false; // token reset ?
      let batch = ldapInfoFetchOther.batchCacheLinkedIn[callbackData.address];
      if ( batch ) { // already in cache
        if ( batch.cache.linkedin.title ) self.WhenSuccess(null);
        self.AfterSuccess(batch.cache.linkedin.title);
        return false;
      }
      let hashes = []; let count = 0;
      ldapInfoFetchOther.queue.every( function(args) {
        if ( !args[0].cache.linkedin['LinkedIn Profile'] && !ldapInfoFetchOther.batchCacheLinkedIn[args[0].address] ) {
          ldapInfoFetchOther.batchCacheLinkedIn[args[0].address] = { cache: args[0].cache };
          hashes.push( encodeURIComponent("<personAddresses index='" + count + "'>\n<hashedAddress>" + ldapInfoUtil.crc32md5(args[0].address) + "</hashedAddress>\n</personAddresses>\n") );
          self.batchAddresses.push(args[0].address);
          count ++;
        }
        return count < 25; // this is post data, but just keep the limit
      } );
      ldapInfoLog.info("loadRemoteLinkedInSearch addresses: " + self.batchAddresses.join(", "));
      self.data = "hashes=" + encodeURIComponent("<hashedAddresses>\n")  + hashes.join('') + encodeURIComponent("</hashedAddresses>\n") + "&ver=15.4420";
      return true;
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

    self.isSuccess = function(request) {
      let xmlDoc = request.responseXML;
      // friends => person[] => userID, fullName, title, webProfilePage, index, <pictureUrl>, <friendStatus>
      //let nsResolver = xmlDoc.createNSResolver( xmlDoc.ownerDocument == null ? xmlDoc.documentElement : xmlDoc.ownerDocument.documentElement);
      //let persons = xmlDoc.evaluate('//person', xmlDoc, nsResolver, Ci.nsIDOMXPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
      if ( !xmlDoc || !xmlDoc.documentElement ) return false;
      let persons = xmlDoc.documentElement.childNodes;
      let found = false;
      for (let i = 0; i < persons.length; i++) {
        let person = persons[i];
        if ( person.tagName != 'person' ) continue;
        let index = -1;
        for ( let p of person.children ) {
          if ( p.tagName == 'index') {
            index = p.textContent;
          }
        }
        if ( index >= 0 ) {
          let cache = ldapInfoFetchOther.batchCacheLinkedIn[self.batchAddresses[index]].cache;
          for ( let p of person.children ) {
            if ( ['fullName', 'title', 'webProfilePage', 'friendStatus', 'pictureUrl' ].indexOf(p.tagName) >= 0 && p.textContent ) {
              let name = p.tagName;
              let value = p.textContent;
              if ( p.tagName == 'title' ) value = '[LinkedIn: ' + value + ']';
              if ( p.tagName == 'webProfilePage' ) name = 'LinkedIn Profile';
              if ( p.tagName == 'fullName' ) name = 'Name';
              cache.linkedin[name] = [ value ];
            }
          }
        }
        if ( index == 0 ) found = true;
      }
      if ( !found ) ldapInfoLog.info("Can't find, innerHTML:" + xmlDoc.documentElement.innerHTML);
      return found;
    };
    self.WhenSuccess = function(request) {
      if ( callbackData.cache.linkedin.pictureUrl && callbackData.cache.linkedin.pictureUrl[0] ) {
        self.isChained = true;
        callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteBase(callbackData, 'LinkedIn', 'linkedin', callbackData.cache.linkedin.pictureUrl[0]));
        delete callbackData.cache.linkedin.pictureUrl;
      }
    };
    self.WhenError = function(request, type, retry) {
      if ( callbackData.cache[self.target].state == ldapInfoUtil.STATE_TEMP_ERROR ) {
        ldapInfoFetchOther.batchCacheLinkedIn = {};
      }
      if ( self.badCert ) {
        if (retry) {
          ldapInfoLog.log("Retry LinkedIn Search.", 1);
          callbackData.tryURLs.unshift(self);
        }
      } else {
        if ( request.status == 401 ) {
          ldapInfoLog.log("LinkedIn token error, Reset LinkedIn token!", 1);
          ldapInfoUtil.prefs.setCharPref('linkedin_token', '');
        }
      }
    };
    return self;
  },
  
  loadRemoteFlickrSearch: function(callbackData) {
    // http://www.flickr.com/services/api/flickr.people.findByEmail.html
    let self = ldapInfoFetchOther.loadRemoteBase(callbackData, 'Flickr', 'flickr',
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
      return ( response && response.stat == 'ok' && response.user && response.user.nsid );
    }
    self.WhenSuccess = function(request) {
      self.isChained = true;
      callbackData.cache.flickr.nsid = [request.response.user.nsid];
      callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteFlickrGetInfo(callbackData));
    };
    return self;
  },
  
  loadRemoteFlickrGetInfo: function(callbackData) {
    let self = ldapInfoFetchOther.loadRemoteBase(callbackData, 'Flickr', 'flickr',
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
        callbackData.tryURLs.unshift(ldapInfoFetchOther.loadRemoteBase(callbackData, 'Flickr', 'flickr',
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
        return self.loadNextRemote(callbackData);
      }
      ldapInfoLog.info('loadNextRemote ' + current.name + ' for ' + callbackData.address);
      if ( Services.io.offline ) {
        callbackData.cache[current.target].state = ldapInfoUtil.STATE_TEMP_ERROR;
        callbackData.cache[current.target]._Status = [current.name + " Offline"];
        return self.loadNextRemote(callbackData);
      }
      if ( !self.requestTimer ) self.requestTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      if ( Object.keys(self.batchCacheFacebook).length || Object.keys(self.batchCacheLinkedIn).length ) return current.makeRequest(); // this is async if call XMLHttpRequest
      else self.requestTimer.initWithCallback( function() { // make it async
        if ( ldapInfoLog && ldapInfoFetchOther ) {
          return current.makeRequest();
        }
      }, 0, Ci.nsITimer.TYPE_ONE_SHOT );
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
                                                            let [aWebProgress, /*aRequest*/, aLocationURI, aFlags] = invocation.arguments;
                                                            if ( aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE ) {
                                                               let args = {location: aLocationURI.prePath, prefetchCert: true};
                                                               mail3PaneWindow.openDialog("chrome://pippki/content/exceptionDialog.xul", "Opt", "chrome,dialog,modal", args);
                                                               if ( args.exceptionAdded ) return aWebProgress.reload(Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY);
                                                               return ldapInfoFetchOther.disableFacebook();
                                                            } else if ( aLocationURI.specIgnoringRef.indexOf(ldapInfoFetchOther.facebookRedirect) == 0 ) {
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
    this.unHook();
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

};
let self = ldapInfoFetchOther;
