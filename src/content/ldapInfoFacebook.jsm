// MPL/GPL
// Opera.Wang 2013/06/20
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFacebook"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");

var ldapInfoFacebook = {
  access_token: null, // TODO: save in prefs
  expires: -1,
  querying: false,
  get_access_token: function() {
    Services.console.logStringMessage('xxx');
    if ( this.querying || this.access_token ) return;
    this.querying = true;
    Services.console.logStringMessage('3');
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      let tabmail = mail3PaneWindow.document.getElementById("tabmail");
      if ( !tabmail ) return;
      Services.console.logStringMessage('5');
      mail3PaneWindow.focus();
      let tab = tabmail.openTab( "contentTab", { contentPage: "https://www.facebook.com/dialog/oauth?client_id=437279149703221&redirect_uri=https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/&response_type=token",
                                                 background: true,
                                                 onListener: function(browser, listener){
                                                   listener.onLocationChange = function(aWebProgress, aRequest, aLocationURI, aFlags) {
                                                     if ( aLocationURI.host == 'addons.mozilla.org' ) {
                                                       // 'access_token=xxx&expires_in=5179267'
                                                       let splitResult = /^access_token=(.+)&expires_in=(\d+)/.exec(aLocationURI.ref);
                                                       if ( splitResult != null ) {
                                                         [, ldapInfoFacebook.access_token, ldapInfoFacebook.expires ] = splitResult;
                                                         Services.console.logStringMessage('token: ' + ldapInfoFacebook.access_token + ":" + ldapInfoFacebook.expires);
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
    //this.access_token = null; // don't clear token
    this.querying = false;
    this.expires = -1;
  }
}