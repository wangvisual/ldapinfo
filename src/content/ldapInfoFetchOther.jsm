// license: GPL V3

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetchOther"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://app/modules/gloda/utils.js");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoFacebook.jsm");

const XMLHttpRequest = CC("@mozilla.org/xmlextras/xmlhttprequest;1"); // > TB15

let ldapInfoFetchOther =  {
    queue: [], // request queue
    lastTime: Date.now(), // last connection use time
    currentAddress: null,

    clearCache: function () {
    },
    
    cleanup: function() {
      try {
        ldapInfoLog.info("ldapInfoFetchOther cleanup");
        this.clearCache();
        if ( this.queue.length >= 1 && typeof(this.queue[0][0]) != 'undefined' ) {
          let callbackData = this.queue[0][0];
        }
        this.queue = [];
        Cu.unload("chrome://ldapInfo/content/ldapInfoUtil.jsm");
      } catch (err) {
        ldapInfoLog.logException(err);
      }
      Cu.unload("chrome://ldapInfo/content/log.jsm");
      this.currentAddress = ldapInfoLog = ldapInfoUtil = null;
    },
    
    callBackAndRunNext: function(callbackData) {
        ldapInfoLog.info('callBackAndRunNext, now is ' + callbackData.address);
        if ( typeof(callbackData.ldapOp) != 'undefined' ) {
            ldapInfoFetchOther.lastTime = Date.now();
        }
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
                //cbd.image.classList.remove('ldapInfoLoadingQueue');
                cbd.callback(cbd);
            } catch (err) {
                ldapInfoLog.logException(err);
            }
            return false;
        });
        ldapInfoLog.logObject(this.queue.map( function(one) {
            return one[5];
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
            this.currentAddress = callbackData.address;
            this.queue.forEach( function(args) {
                if ( args[0].address == ldapInfoFetchOther.currentAddress ) {
                    args[0].image.classList.remove('ldapInfoLoadingQueue');
                    args[0].image.classList.add('ldapInfoLoading');
                }
            } );
            callbackData.tryURLs = [];
            if ( 1 ) {
              callbackData.tryURLs.push([callbackData.address, "https://www.facebook.com/search.php?type=user&q=" + callbackData.address + "&access_token=" + ldapInfoFacebook.access_token, "FacebookSearch"]);
              callbackData.tryURLs.push([callbackData.address, "https://graph.facebook.com/{UID}/picture", "Facebook"]);
            }
            if ( 1 && ["gmail.com", "googlemail.com"].indexOf(callbackData.mailDomain)>= 0 ) {
              let mailID = callbackData.mailid.replace(/\+.*/, '');
              callbackData.tryURLs.push([callbackData.address, "http://profiles.google.com/s2/photos/profile/" + mailID, "Google"]);
              //callbackData.tryURLs.push([callbackData.address, "https://plus.google.com/s2/photos/profile/" + mailID, "Google+"]);
            }
            if ( ldapInfoUtil.options.load_from_gravatar ) {
              let hash = GlodaUtils.md5HashString( callbackData.address );
              callbackData.tryURLs.push([callbackData.address, 'http://www.gravatar.com/avatar/' + hash + '?d=404', "Gravatar"]);
            }
            //callbackData.tryURLs.push([callbackData.address, image.getAttribute('src'), "Default"]); // fallback to current src
            ldapInfoLog.logObject(callbackData.tryURLs, 'callbackData.tryURLs', 1);
            this.loadRemote(callbackData);
            //let first = 
            
            //image.trying = first[2];
            //image.setAttribute('src', first[1]);
        } catch (err) {
            ldapInfoLog.logException(err);
            callbackData.ldap['_Status'] = ['Exception'];
            this.callBackAndRunNext(callbackData); // with failure
        }
    },

    loadRemote: function(callbackData) {
      try {
        let current = callbackData.tryURLs.shift();
        //let type = current[2] == 'FacebookSearch' ? "document" : "image";
        let oReq = new XMLHttpRequest();
        oReq.open("GET", current[1], true);
        oReq.responseType = 'blob';
        // cache control ?
        oReq.timeout = ldapInfoUtil.options['ldapTimeoutInitial'] * 1000;
        oReq.onload = function (oEvent) {
          // oEvent.target && currentTarget is oReq
          ldapInfoLog.logObject(oReq.response, 'oReq.response', 0); //type: text/html
          ldapInfoLog.log('headers: ' + oReq.getAllResponseHeaders());
          let header = oReq.getResponseHeader('Content-Type'); // text/html; charset=utf-8
          if ( !header ) header = 'image/png';
          let win = callbackData.win.get();
          if ( win && win.document ) {
            let blob = new win.Blob([oReq.response], {type: 'document'});
            ldapInfoLog.logObject(blob, 'blob', 0);
          }
          callbackData.success = true;
        };
        oReq.onloadstart = function() {
          ldapInfoLog.logObject(oReq, 'start', 0);
          callbackData.success = false;
        };
        oReq.onloadend = function() {
          ldapInfoLog.logObject(oReq, 'loadend', 0);
          if ( callbackData.success ) {
            if ( current[2] == 'FacebookSearch' ) {
              // try next
            } else {
              //run next
            }
          } else {
            if ( current[2] == 'FacebookSearch' ) {
              // run next
            } else {
              // try next
            }
          }
        };
        oReq.send();
      } catch(err) {  
          ldapInfoLog.logException(err);
      }
    },
}