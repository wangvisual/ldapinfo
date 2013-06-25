// MPL/GPL
// Opera.Wang 2013/06/20
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFacebook"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");

var ldapInfoFacebook = {
  access_token: ldapInfoUtil.options.facebook_token,
  expires: ldapInfoUtil.options.facebook_token_expire,
  querying: false,
  get_access_token: function() {
    if ( this.querying || this.access_token ) return;
    this.querying = true;
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      let tabmail = mail3PaneWindow.document.getElementById("tabmail");
      if ( !tabmail ) return;
      mail3PaneWindow.focus();
      let client= "client_id=437279149703221";
      let scope = "&scope=email,read_stream";
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
                                                         [, ldapInfoFacebook.access_token, ldapInfoFacebook.expires ] = splitResult;
                                                         Services.console.logStringMessage('token: ' + ldapInfoFacebook.access_token + ":" + ldapInfoFacebook.expires);
                                                         ldapInfoFacebook.expires = ( +ldapInfoFacebook.expires + Date.now() / 1000 - 60 ) + "";
                                                         let branch = Services.prefs.getBranch("extensions.ldapinfoshow.");
                                                         //branch.setCharPref('facebook_token', ldapInfoFacebook.access_token);
                                                         //branch.setCharPref('facebook_token_expire', ldapInfoFacebook.expires);
                                                       }
                                                       tabmail.closeTab(tab);
                                                       ldapInfoFacebook.querying = false;
                                                     }
                                                   };
                                                 }
      });
    }
  },
  cleanup: function() {
    //this.access_token = null; // don't clear token etc
    this.querying = false;
  }
}