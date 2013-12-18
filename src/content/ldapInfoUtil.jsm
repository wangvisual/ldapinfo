// MPL/GPL
// Opera.Wang 2013/06/04
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoUtil"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://app/modules/gloda/utils.js");
Cu.import("chrome://ldapInfo/content/log.jsm");
const mozIJSSubScriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

var ldapInfoUtil = {
  Name: "Awesome ldapInfoShow xxx", // might get changed by getAddonByID function call
  Version: 'unknown',
  isSeaMonkey: Services.appinfo.ID == SEAMONKEY_ID,
  Applicaton: ( Services.appinfo.ID == SEAMONKEY_ID ) ? 'Seamonky' : 'Thunderbird',
  STATE_INIT: 0,
  STATE_QUERYING: 1,
  STATE_DONE: 2,
  STATE_ERROR: 4,
  STATE_TEMP_ERROR: 8,
  CHAR_QUERYING: '\u231B',
  CHAR_HAVEPIC: '\u2714',
  CHAR_NOPIC: '\u237b',
  CHAR_NOUSER: '\u2718',
  initName: function() {
    if ( this.Version != 'unknown' ) return;
    AddonManager.getAddonByID('ldapInfo@opera.wang', function(addon) {
      ldapInfoUtil.Version = addon.version;
      ldapInfoUtil.Name = addon.name;
    });
  },
  // http://stackoverflow.com/questions/1248302/javascript-object-size
  // recursive version is faster
  roughSizeOfObject: function( object ) {
    let bytes = 0;
    let type = typeof(object);
    if ( type === 'boolean' ) bytes += 4;
    else if ( type === 'string' ) bytes += object.length * 2;
    else if ( type === 'number' ) bytes += 8;
    else if ( type === 'object' ) for( let i in object ) bytes += this.roughSizeOfObject(i) + this.roughSizeOfObject(object[i]);
    return bytes;
  },
  // http://stackoverflow.com/questions/2692323/code-golf-friendly-number-abbreviator
  friendlyNumber: function(a,b){
    let c=(''+a).length;
    b=Math.pow(10,b);
    return((a*b/Math.pow(10,c-=c%3))+.5|0)/b+' KMGTPE'[c/3];
  },
  loadInTopWindow: function(win, url) {
    win.openDialog("chrome://messenger/content/", "_blank", "chrome,dialog=no,all", null,
      { tabType: "contentTab", tabParams: {contentPage: Services.io.newURI(url, null, null) } });
  },
  loadUseProtocol: function(url) {
    try {
      Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService).loadURI(Services.io.newURI(url, null, null), null);
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },
  loadDonate: function(pay) {
    let url = "https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=893LVBYFXCUP4&lc=US&item_name=Expression%20Search&no_note=0&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHostedGuest";
    if ( typeof(pay) != 'undefined' ) {
      if ( pay == 'alipay' ) url = "https://me.alipay.com/operawang";
      if ( pay == 'mozilla' ) url = "https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/developers?src=api"; // Meet the developer page
    }
    this.loadUseProtocol(url);
  },
  sendEmailWithTB: function(url) {
    MailServices.compose.OpenComposeWindowWithURI(null, Services.io.newURI(url, null, null));
  },
  loadTab: function(args) {
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      let tabmail = mail3PaneWindow.document.getElementById("tabmail");
      if ( !tabmail ) return;
      mail3PaneWindow.focus();
      tabmail.openTab(args.type, args);
    }
  },
  getErrorMsg: function(pStatus) { // https://developer.mozilla.org/en/docs/Table_Of_Errors
    if ( ( pStatus & 0x80590000 ) == 0x80590000 ) { // http://dxr.mozilla.org/mozilla-central/source/xpcom/base/nsError.h
      let ldapBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
      try { return ldapBundle.GetStringFromID(pStatus & 0xff); } catch(err) {};
    } else {
      for ( let p in Cr ) {
          if ( Cr[p] == pStatus ) return p;
      }
    }
    return 'Unknown Error';
  },
  
  // https://outlook.linkedinlabs.com/osc/login email false ""
  // ldap://directory.company.com uid=foobar false ldap://directory.company.com/o=company.com??sub?(objectclass=*)
  getPasswordForServer: function (serverUrl, login, force, realm) {
      //Services.console.logStringMessage('getPasswordForServer ' + serverUrl + ' login:' + login);
      let passwordManager = Services.logins;
      if ( !passwordManager) return false;
      let URI = Services.io.newURI(serverUrl, null, null);
      let isLDAP = URI.scheme == 'ldap';
      let password = { value: "" };
      let check = { value: true };
      let oldLoginInfo;
      try {    
          let logins = passwordManager.findLogins({}, URI.prePath, /*aActionURL*/ ( isLDAP ? null : URI.path ), realm);            
          let foundCredentials = false;
          for (let i = 0; i < logins.length; i++) {
              if (logins[i].username == '' || logins[i].username == login) {
                  password.value = logins[i].password;
                  foundCredentials = true;
                  oldLoginInfo = logins[i];
                  break;
              }
          }
          if(foundCredentials & (!force)) {
              return password.value;
          }
      } catch(err) {
          ldapInfoLog.logException(err);
      }
      if ( force == "REMOVE" && oldLoginInfo ) return passwordManager.removeLogin(oldLoginInfo);
      let strBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
      let strBundle2 = Services.strings.createBundle('chrome://passwordmgr/locale/passwordmgr.properties');

      let prompts = Services.prompt;
      let okorcancel = prompts.promptPassword(null, ( isLDAP ? strBundle.GetStringFromName("authPromptTitle") : "Server Password Required" ), 
                          strBundle.formatStringFromName("authPromptText", [login + ' @ ' + URI.host], 1), // Please enter your password for %1$S.
                          password, 
                          strBundle2.GetStringFromName("rememberPassword"),
                          check);
      if(!okorcancel) return;
      if(check.value) {
          let nsLoginInfo = new CC("@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");
          ldapInfoLog.info('login:' + URI.prePath + ":" + ( isLDAP ? null : URI.path ) + ':' +  realm + ':' + ( isLDAP ? "" : login ) + ':' + password.value );
          let loginInfo = new nsLoginInfo(URI.prePath, ( isLDAP ? null : URI.path ), realm, ( isLDAP ? "" : login ), password.value, "", ""); // user name for LDAP is "", it's the same as adddressbook does
          try {
              if(oldLoginInfo) {
                passwordManager.modifyLogin(oldLoginInfo, loginInfo);
              } else {
                passwordManager.addLogin(loginInfo);
              }
          } catch(err){ ldapInfoLog.logException(err); }
      }
      return password.value;
  },
  
  byteArray2Base64: function(win, bytes) {
    // Using String.fromCharCode.apply may get error like 'RangeError: arguments array passed to Function.prototype.apply is too large' if the image is too big
    // return win.btoa( String.fromCharCode.apply(null, new Uint8Array(bytes)) );
    let u8 = new Uint8Array(bytes);
    let str_array = [];
    for (let i = 0; i < u8.length; i++) {
      str_array[i] = String.fromCharCode(u8[i]);
    }
    return win.btoa(str_array.join(""));
  },
  //http://stackoverflow.com/questions/18638900/javascript-crc32
  crcTable: [],
  makeCRCTable: function(){
    let c;
    for(let n =0; n < 256; n++){
      c = n;
      for(let k =0; k < 8; k++){
        c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      this.crcTable[n] = c;
    }
  },
  crc32: function(str) {
    if ( this.crcTable.length == 0 ) this.makeCRCTable();
    let crcTable = this.crcTable;
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++ ) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  },
  crc32md5: function(email) {
    return this.crc32(email) + "_" + GlodaUtils.md5HashString(email);
  },
  hmac: Cc["@mozilla.org/security/hmac;1"].createInstance(Ci.nsICryptoHMAC),
  key: Cc["@mozilla.org/security/keyobjectfactory;1"].getService(Ci.nsIKeyObjectFactory).keyFromString(Ci.nsIKeyObject.HMAC,
    [String.fromCharCode(a.charCodeAt(0)-5) for (a of "ff6:gi:k5=>jg>8f:g7g9f5j66998hg<=j99k89i".split(''))].join('')), // make the key to sign the request not searchable by search engine like Google.
  b64_hmac_sha1: function(data) { // Data: No UTF-8 encoding, special chars are already escaped.
    this.hmac.init(this.hmac.SHA1,this.key);
    let bytes = [b.charCodeAt() for each (b in data)];
    this.hmac.update(bytes, bytes.length);
    let signature = this.hmac.finish(true);
    this.hmac.reset(); // reset data but not algorithm & key
    return signature;
  },

  folderPicker: function(win, prefid) {
    try {
      let perf = win.document.getElementById(prefid);
      if ( !perf ) return;
      const nsIFilePicker = Ci.nsIFilePicker;
      let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      let fpCallback = function fpCallback_done(aResult) {
        if (aResult == nsIFilePicker.returnOK) {
          try {
            if ( fp.file && fp.file.path && fp.file.isDirectory() && fp.file.isReadable() ) {
              perf.value = fp.file.path;
            }
          } catch (err) {
            ldapInfoLog.logException(err);
          }
        }
      };
      fp.init(win, "Folder", nsIFilePicker.modeGetFolder);
      try {
        fp.displayDirectory = new FileUtils.File(perf.value);
      } catch (err) {}
      fp.open(fpCallback);
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },

  // TODO: When bug 564675 is implemented this will no longer be needed
  // Always set the default prefs, because they disappear on restart
  setDefaultPrefs: function (path) {
    let branch = Services.prefs.getDefaultBranch("");
    let prefLoaderScope = {
      pref: function(key, val) {
        switch (typeof val) {
          case "boolean":
            branch.setBoolPref(key, val);
            break;
          case "number":
            branch.setIntPref(key, val);
            break;
          case "string":
            branch.setCharPref(key, val);
            break;
        }
      }
    };
    let uri = Services.io.newURI("defaults/preferences/prefs.js", null, Services.io.newURI(path, null, null));
    try {
      mozIJSSubScriptLoader.loadSubScript(uri.spec, prefLoaderScope);
    } catch (err) {
      Cu.reportError(err);
    }
  },
  options: { disable_server_lists: [] },
  initPerf: function(path) {
    this.setDefaultPrefs(path);
    this.prefs = Services.prefs.getBranch("extensions.ldapinfoshow.");
    this.prefs.addObserver("", this, false);
    try {
      [ "disabled_servers", "ldap_attributes", "photoURL", "load_from_local_dir", "local_pic_dir", "load_from_domain_wildcard", "load_from_addressbook", "load_from_gravatar", "filterTemplate", "click2dial"
      , "load_from_facebook", "facebook_token", "facebook_token_expire", "load_from_google", "load_from_remote_always", "load_from_all_remote", "ldap_ignore_domain",
      , "load_from_linkedin", "linkedin_user", "linkedin_token", "warned_about_fbli", "load_from_flickr", "ldap_batch", "ignore_facebook_default", "show_pics_left_side",
      , "load_from_photo_url", "load_from_ldap", "ldapIdleTimeout", "ldapTimeoutWhenCached", "ldapTimeoutInitial", "numberLimitSingle", "numberLimitMulti", "enable_verbose_info"].forEach( function(key) {
        ldapInfoUtil.observe('', 'nsPref:changed', key); // we fake one
      } );
    } catch (err) { ldapInfoLog.logException(err); }
  },
  observe: function(subject, topic, data) {
    if (topic != "nsPref:changed") return;
    let clean;
    switch(data) {
      case "enable_verbose_info":
      case "load_from_remote_always":
      case "load_from_all_remote":
      case "ldap_ignore_domain":
      case "load_from_ldap":
      case "load_from_addressbook":
      case "load_from_facebook":
      case "load_from_linkedin":
      case "load_from_flickr":
      case "load_from_google":
      case "load_from_gravatar":
      case "load_from_local_dir":
      case "load_from_domain_wildcard":
      case "warned_about_fbli":
      case "show_pics_left_side":
      case "ignore_facebook_default": // not worth of clean facebook cache
        this.options[data] = this.prefs.getBoolPref(data);
        break;
      case "load_from_photo_url":
        this.options[data] = this.prefs.getBoolPref(data);
        clean = 'ldap';
        break;
      case "ldap_attributes":
      case "photoURL":
      case "filterTemplate":
        clean = 'ldap';
        // NO BREAK HERE
      case "local_pic_dir":
        if ( !clean ) clean = 'local_dir';
        // NO BREAK HERE
      case "facebook_token":
        if ( !clean ) clean = 'facebook';
        // NO BREAK HERE
      case "linkedin_user":
      case "linkedin_token":
        if ( !clean ) clean = 'linkedin';
        // NO BREAK HERE
      case "facebook_token_expire":
      case "click2dial":
      case "disabled_servers":
        this.options[data] = this.prefs.getCharPref(data);
        break;
      default:
        this.options[data] = this.prefs.getIntPref(data);
        break;
    }
    if ( clean && typeof(this._onChangeCallback) == 'function' ) this._onChangeCallback(clean);
    if ( data == 'disabled_servers' ) {
      this.options.disable_server_lists = [];
      this.options['disabled_servers'].split(/[,;: ]+/).forEach(function(server) {
        ldapInfoUtil.options.disable_server_lists[server] = 1;
      });
    } else if ( data == 'enable_verbose_info' ) {
      ldapInfoLog.setVerbose(this.options.enable_verbose_info);
    }
  },
  setChangeCallback: function(callback) {
    this._onChangeCallback = callback;
  },
  onSyncFromPreference: function(doc,self) {
    let textbox = self;
    let preference = doc.getElementById('facebook_token_expire');
    let actualValue = preference.value !== undefined ? preference.value : preference.defaultValue;
    let date = new Date((+actualValue)*1000);
    return date.toLocaleFormat("%Y/%m/%d %H:%M:%S");
  },
  resetToken: function(doc) {
    ["pref_facebook_token", "facebook_token_expire"].forEach( function(ID) {
      let element = doc.getElementById(ID);
      if ( element ) element.reset();
    } );
  },
  LinkedInLogout: function() {
    this.prefs.setCharPref("linkedin_token", "");
  },
  cleanup: function() {
    this.prefs.removeObserver("", this, false);
    //this.prefs = null;
    //this.options = {};
    ldapInfoLog = null;
    delete this._onChangeCallback;
  },
  
  loadPerfWindow: function(doc) {
    try {
      let group = doc.getElementById('ldapinfoshow-enable-servers');
      let accounts = MailServices.accounts.accounts;
      for (let i = 0; i < accounts.length; i++) {
        let account = accounts.queryElementAt(i, Ci.nsIMsgAccount);
        let server = account.incomingServer;
        let checkbox = doc.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "checkbox");
        checkbox.setAttribute("label", server.prettyName);
        checkbox.key = server.key;
        checkbox.setAttribute("checked", typeof(this.options.disable_server_lists[server.key]) == 'undefined' || !this.options.disable_server_lists[server.key]);
        group.insertBefore(checkbox, null);
      }
    } catch (err) { ldapInfoLog.logException(err); }
    return true;
  },
  acceptPerfWindow: function(win) {
    try {
      let disabled = [];
      for ( let checkbox of win.document.getElementById('ldapinfoshow-enable-servers').childNodes ) {
        if ( checkbox.key && !checkbox.checked ) disabled.push(checkbox.key);
      }
      this.prefs.setCharPref("disabled_servers", disabled.join(','));
      if ( !this.options.warned_about_fbli && ( this.options.load_from_facebook || this.options.load_from_linkedin ) ) {
        this.prefs.setBoolPref("warned_about_fbli", true);
        let strBundle = Services.strings.createBundle('chrome://ldapInfo/locale/ldapinfoshow.properties');
        this.loadUseProtocol("http://code.google.com/p/ldapinfo/wiki/Help");
        let result = Services.prompt.confirm(win, strBundle.GetStringFromName("prompt.warning"), strBundle.GetStringFromName("prompt.confirm.fbli"));
        if ( !result ) {
          this.prefs.setBoolPref("load_from_facebook", false);
          this.prefs.setBoolPref("load_from_linkedin", false);
          return false;
        }
      }
    } catch (err) { ldapInfoLog.logException(err); }
    return true;
  },

}
ldapInfoUtil.initName();
