// license: GPL V3

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoLoadRemoteBase"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");

function ldapInfoLoadRemoteBase(callbackData, name, target, url, loadNextRemote) {
  let self = this; // new Object
  self.callbackData = callbackData;
  self.name = name;
  self.target = target;
  self.url = url;
  self.loadNextRemote = loadNextRemote;
  self.isSuccess = function(request) { return true; };
  self.addtionalErrMsg = "";
  self.badCert = false;
  self.WhenError = function(request, type, retry) {};
  self.method = "GET";
  self.type = 'arraybuffer';
  self.isChained = false; // for FacebookFQLSearch etc, when success, will chain another request
  self.data = null;
  return this;
}

ldapInfoLoadRemoteBase.prototype = {
  // modify from old AddonManager.jsm
  // https://wiki.mozilla.org/User:Dolske/PromptRework
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIInterfaceRequestor]),
  getInterface: function(iid) {
    let win = this.callbackData.win.get();
    if ( iid.equals(Ci.nsIAuthPrompt2) ) {
      return Cc["@mozilla.org/passwordmanager/authpromptfactory;1"].getService(Ci.nsIPromptFactory).getPrompt(win, Ci.nsIAuthPrompt2);
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
  WhenSuccess: function(request) {
    if ( this.target == 'google' ) this.callbackData.cache.google['Google Profile'] = ["https://profiles.google.com/" + this.callbackData.mailid];
    if ( this.target == 'gravatar' ) this.callbackData.cache.gravatar['Gravatar Profile'] = ["http://www.gravatar.com/" + this.callbackData.gravatarHash];
    let type = request.getResponseHeader('Content-Type') || 'image/png'; // image/gif or application/json; charset=utf-8 or text/html; charset=utf-8
    let win = this.callbackData.win.get();
    if ( win && win.btoa && type != 'text/xml' && request.response ) {
      this.callbackData.cache[this.target].src = "data:" + type + ";base64," + ldapInfoUtil.byteArray2Base64(win, request.response);
    }
  },
  setRequestHeader: function(request) { },
  beforeRequest: function() { return true; },
  AfterSuccess: function(has_user) { // change state/_Status, call loadNextRemote if needed
    if ( !this.isChained ) {
      this.callbackData.cache[this.target].state = ldapInfoUtil.STATE_DONE;
      this.callbackData.cache[this.target]._Status = [this.name + ' '
        + ( this.callbackData.cache[this.target].src ? ldapInfoUtil.CHAR_HAVEPIC : ( typeof(has_user) != 'undefined' ? ldapInfoUtil.CHAR_NOPIC : ldapInfoUtil.CHAR_NOUSER ) )];
    }
    this.loadNextRemote(this.callbackData);
  },
  makeRequest: function() {
    let self = this;
    if ( !self.beforeRequest() ) return;
    let callbackData = self.callbackData;
    ldapInfoLog.info(self.method + " URL " + self.url);
    // Using XMLHttpRequest from hiddenDOMWindow create several problems
    // It will show 'Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at ...', can bypass using mozSystem
    // But it can't show password prompt because 'Cannot call openModalWindow on a hidden window'
    // let XMLHttpRequest = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService).hiddenDOMWindow.XMLHttpRequest;
    // let oReq = new XMLHttpRequest();
    // this not work either:
    // let win = callbackData.win.get();
    // let oReq = new win.XMLHttpRequest({mozSystem: true}); // the same origin policy will not be enforced on the request
    // https://developer.mozilla.org/en-US/docs/nsIXMLHttpRequest
    let oReq = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest); // > TB15
    oReq.responseType = self.type;
    oReq.timeout = ldapInfoUtil.options['ldapTimeoutInitial'] * 1000;
    oReq.withCredentials = true;
    oReq.mozBackgroundRequest = false;
    let loadListener = function(event) {
      let request = event.target || this;
      delete callbackData.req;
      let success = ( event.type == 'load' && request.status == "200" && request.response ) && self.isSuccess(request);
      ldapInfoLog.info('XMLHttpRequest of ' + self.name + ' for ' + callbackData.address + " " + event.type + " status:" + request.status + " success:" + success);
      if ( success ) {
        self.WhenSuccess(request);
        self.AfterSuccess(true);
      } else {
        if ( event.type != 'load' ) { // error happens
          callbackData.cache[self.target].state = ldapInfoUtil.STATE_TEMP_ERROR;
          let status = request.channel.QueryInterface(Ci.nsIRequest).status;
          ldapInfoLog.info("nsIRequest status 0x" + status.toString(16) + " :" + ldapInfoUtil.getErrorMsg(status));
          if ( event.type == 'timeout' || event.type == 'abort' ) {
            self.addtionalErrMsg += ' ' + event.type;
            if ( event.type == 'timeout' ) ldapInfoLog.log("Query for " + self.name + " meet time out " + (request.timeout/1000) + " S", "Timeout");
          } else { // 'error'
            if ((status & 0xff0000) === 0x5a0000) { // Security module
              self.addtionalErrMsg += ' Security Error';
              self.badCert = true;
            } else {
              self.addtionalErrMsg += ' ' + ldapInfoUtil.getErrorMsg(status).replace(/^NS_ERROR_/, '');
            }
          }
        }
        if ( [0, 200, 403].indexOf(request.status) >= 0 && self.type != 'document' ) ldapInfoLog.logObject(request.response,'request.response ' + request.responseType,1);
        if ( callbackData.cache[self.target].state < ldapInfoUtil.STATE_DONE ) callbackData.cache[self.target].state = ldapInfoUtil.STATE_DONE;
        if ( request.status != 404 ) {
          if ( request.response && request.response.error_msg ) {
            self.addtionalErrMsg += " " + request.response.error_msg;
          } else if ( request.status != 200 && request.statusText ) self.addtionalErrMsg += " " + request.statusText;
        }
        let retry = false;
        if (self.badCert) {
          let win = callbackData.win.get();
          if ( win && win.document ) {
            let url = Services.io.newURI(self.url, null, null);
            let strBundle = Services.strings.createBundle('chrome://ldapInfo/locale/ldapinfoshow.properties');
            let msg = strBundle.GetStringFromName("prompt.confirm.bad.cert").replace('%SERVER%', url.prePath).replace('%SERVICE%', self.name).replace('%ADDON%', ldapInfoUtil.Name).replace('%APP%', Services.appinfo.name);
            let result = Services.prompt.confirm(win, strBundle.GetStringFromName("prompt.warning"), msg);
            let args = {location: url.prePath, prefetchCert: true};
            if ( result ) win.openDialog("chrome://pippki/content/exceptionDialog.xul", "Opt", "chrome,dialog,modal", args);
            retry = result && args.exceptionAdded;
            if ( !retry ) {
              ldapInfoLog.log("Disable ' + self.name + ' support.", 1);
              ldapInfoUtil.prefs.setBoolPref('load_from_' + self.target, false);
            }
          }
        }
        self.WhenError(request, event.type, retry);
        callbackData.cache[self.target]._Status = [self.name + self.addtionalErrMsg + " " + ldapInfoUtil.CHAR_NOUSER];
        self.loadNextRemote(callbackData);
      }
      request.removeEventListener("load", loadListener, false);
      request.removeEventListener("abort", loadListener, false);
      request.removeEventListener("error", loadListener, false);
      request.removeEventListener("timeout", loadListener, false);
      request.abort(); // without abort, when disable add-on, it takes quite a while to unload this js module
    };
    oReq.addEventListener("load", loadListener, false);
    oReq.addEventListener("abort", loadListener, false);
    oReq.addEventListener("error", loadListener, false);
    oReq.addEventListener("timeout", loadListener, false);
    //oReq.addEventListener("loadend", loadListener, false); // loadend including load/error/abort/timeout
    oReq.open(self.method, self.url, true);
    callbackData.req = oReq; // only the latest request will be saved for later possible abort
    self.setRequestHeader(oReq);
    oReq.channel.notificationCallbacks = self; // so prompt can save password
    oReq.send(self.data);
  },
};
