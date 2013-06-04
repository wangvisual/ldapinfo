// MPL/GPL
// Opera.Wang 2013/06/04
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoUtil"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");
const mozIJSSubScriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

var ldapInfoUtil = {
  loadInTopWindow: function(win, url) {
    win.openDialog("chrome://messenger/content/", "_blank", "chrome,dialog=no,all", null,
      { tabType: "contentTab", tabParams: {contentPage: Services.io.newURI(url, null, null) } });
  },
  loadUseProtocol: function(url) {
    Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService).loadURI(Services.io.newURI(url, null, null), null);
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
    if (uri.QueryInterface(Ci.nsIFileURL).file.exists()) {
      mozIJSSubScriptLoader.loadSubScript(uri.spec, prefLoaderScope);
    }
  },
  options: {},
  initPerf: function(path) {
    this.setDefaultPrefs(path);
    this.prefs = Services.prefs.getBranch("extensions.ldapinfoshow.");
    this.prefs.addObserver("", this, false);
    try {
      ["ldap_attributes", "photoURL", "photoVariable", "click2dial", "ldapIdleTimeout", "ldapTimeoutWhenCached", "ldapTimeoutInitial", "enable_verbose_info"].forEach( function(key) {
        ldapInfoUtil.observe('', 'nsPref:changed', key); // we fake one
      } );
    } catch (err) { Services.console.logStringMessage(err); }
  },
  observe: function(subject, topic, data) {
    if (topic != "nsPref:changed") return;
      switch(data) {
        case "enable_verbose_info":
          this.options[data] = this.prefs.getBoolPref(data);
          break;
        case "ldap_attributes":
        case "photoURL":
        case "photoVariable":
        case "click2dial":
          this.options[data] = this.prefs.getCharPref(data);
          break;
        default:
          this.options[data] = this.prefs.getIntPref(data);
          break;
     }
  },
  cleanup: function() {
    this.prefs.removeObserver("", this, false);
    this.prefs = this.options = null;
  }
}