// MPL/GPL
// Opera.Wang 2013/06/04
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoUtil"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://app/modules/gloda/utils.js");
const mozIJSSubScriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

var ldapInfoUtil = {
  isSeaMonkey: Services.appinfo.ID == SEAMONKEY_ID,
  STATE_INIT: 0,
  STATE_QUERYING: 1,
  STATE_DONE: 2,
  STATE_ERROR: 4,
  STATE_TEMP_ERROR: 8,
  loadInTopWindow: function(win, url) {
    win.openDialog("chrome://messenger/content/", "_blank", "chrome,dialog=no,all", null,
      { tabType: "contentTab", tabParams: {contentPage: Services.io.newURI(url, null, null) } });
  },
  loadUseProtocol: function(url) {
    try {
      Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService).loadURI(Services.io.newURI(url, null, null), null);
    } catch (err) {
      Services.console.logStringMessage(err);
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
  loadTab: function(type, args) {
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      let tabmail = mail3PaneWindow.document.getElementById("tabmail");
      if ( !tabmail ) return;
      mail3PaneWindow.focus();
      tabmail.openTab(type, args);
    }
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
  
  // https://github.com/jrconlin/oauthsimple/blob/master/js/OAuthSimple.js
  b64_hmac_sha1: function(k,d,_p,_z) {
    // heavily optimized and compressed version of http://pajhome.org.uk/crypt/md5/sha1.js
    // _p = b64pad, _z = character size; not used here but I left them available just in case
    if (!_p) {_p = '=';}if (!_z) {_z = 8;}function _f(t,b,c,d) {if (t < 20) {return (b & c) | ((~b) & d);}if (t < 40) {return b^c^d;}if (t < 60) {return (b & c) | (b & d) | (c & d);}return b^c^d;}function _k(t) {return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;}function _s(x,y) {var l = (x & 0xFFFF) + (y & 0xFFFF), m = (x >> 16) + (y >> 16) + (l >> 16);return (m << 16) | (l & 0xFFFF);}function _r(n,c) {return (n << c) | (n >>> (32 - c));}function _c(x,l) {x[l >> 5] |= 0x80 << (24 - l % 32);x[((l + 64 >> 9) << 4) + 15] = l;var w = [80], a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;for (var i = 0; i < x.length; i += 16) {var o = a, p = b, q = c, r = d, s = e;for (var j = 0; j < 80; j++) {if (j < 16) {w[j] = x[i + j];}else {w[j] = _r(w[j - 3]^w[j - 8]^w[j - 14]^w[j - 16], 1);}var t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j)));e = d;d = c;c = _r(b, 30);b = a;a = t;}a = _s(a, o);b = _s(b, p);c = _s(c, q);d = _s(d, r);e = _s(e, s);}return [a, b, c, d, e];}function _b(s) {var b = [], m = (1 << _z) - 1;for (var i = 0; i < s.length * _z; i += _z) {b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _z - i % 32);}return b;}function _h(k,d) {var b = _b(k);if (b.length > 16) {b = _c(b, k.length * _z);}var p = [16], o = [16];for (var i = 0; i < 16; i++) {p[i] = b[i]^0x36363636;o[i] = b[i]^0x5C5C5C5C;}var h = _c(p.concat(_b(d)), 512 + d.length * _z);return _c(o.concat(h), 512 + 160);}function _n(b) {var t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', s = '';for (var i = 0; i < b.length * 4; i += 3) {var r = (((b[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((b[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((b[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);for (var j = 0; j < 4; j++) {if (i * 8 + j * 6 > b.length * 32) {s += _p;}else {s += t.charAt((r >> 6 * (3 - j)) & 0x3F);}}}return s;}function _x(k,d) {return _n(_h(k, d));}return _x(k, d);
  };

  test: function() {
    let key = 'aa15bd5f089eb93a5b2b4a0e11443cb78e44f34d';
    Services.console.logStringMessage(this.b64_hmac_sha1(key, 'c9cd3f2ee42a97bcf7d104b964fb9a25')); // => koDeu32gWA+ZnRXKXQpBSrNa/LI=
    // POST/osc/people/details + LSC-Token + LSC-Timestamp
    Services.console.logStringMessage(this.b64_hmac_sha1(key, "POST%2Fosc%2Fpeople%2Fdetails2e40155f-5711-44eb-82b0-d203d3598139%4018f27556-c88a-4b5c-a601-d8fc83ffXXXX1383819215")); // => 2qHyZZIhAbVGFgA+TD6vMSp8owM=
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
            Services.console.logStringMessage(err);
          }
        }
      };
      fp.init(win, "Folder", nsIFilePicker.modeGetFolder);
      try {
        fp.displayDirectory = new FileUtils.File(perf.value);
      } catch (err) {}
      fp.open(fpCallback);
    } catch (err) {
      Services.console.logStringMessage(err);
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
      [ "disabled_servers", "ldap_attributes", "photoURL", "load_from_local_dir", "local_pic_dir", "load_from_addressbook", "load_from_gravatar", "filterTemplate", "click2dial"
      , "load_from_facebook", "facebook_token", "facebook_token_expire", "load_from_google", "load_from_remote_always", "load_from_all_remote", "ldap_ignore_domain",
      , "load_from_photo_url", "load_from_ldap", "ldapIdleTimeout", "ldapTimeoutWhenCached", "ldapTimeoutInitial", "numberLimitSingle", "numberLimitMulti", "enable_verbose_info"].forEach( function(key) {
        ldapInfoUtil.observe('', 'nsPref:changed', key); // we fake one
      } );
    } catch (err) { Services.console.logStringMessage(err); }
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
      case "load_from_google":
      case "load_from_gravatar":
      case "load_from_local_dir":
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
  cleanup: function() {
    this.prefs.removeObserver("", this, false);
    this.prefs = null;
    //this.options = {};
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
    } catch (err) { Services.console.logStringMessage(err); }
    return true;
  },
  acceptPerfWindow: function(doc) {
    try {
      let disabled = [];
      for ( let checkbox of doc.getElementById('ldapinfoshow-enable-servers').childNodes ) {
        if ( checkbox.key && !checkbox.checked ) disabled.push(checkbox.key);
      }
      this.prefs.setCharPref("disabled_servers", disabled.join(','));
    } catch (err) { Services.console.logStringMessage(err); }
    return true;
  },

}