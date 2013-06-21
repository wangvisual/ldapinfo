// MPL/GPL
// Opera.Wang 2013/06/20
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFacebook"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");

var ldapInfoFacebook = {
  access_token: null, // TODO: save in prefs
  expires: -1;
  querying: false;
  get_access_token: function() {
    if ( this.querying || this.access_token ) return;
    querying = true;
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      let tabmail = mail3PaneWindow.document.getElementById("tabmail");
      if ( !tabmail ) return;
      mail3PaneWindow.focus();
      let tab = tabmail.openTab( "contentTab", { contentPage: "https://www.facebook.com/dialog/oauth?client_id=437279149703221&redirect_uri=http://ldapinfo.com/index.html&response_type=token",
                                                 background: true,
                                                 onListener: function(browser, listener){
                                                   listener.onLocationChange = function(aWebProgress, aRequest, aLocationURI, aFlags) {
                                                     if ( aLocationURI.host == 'ldapinfo.com' ) {
                                                       // 'access_token=xxx&expires_in=5179267'
                                                       splitResult = /^(access_token=.+)&(expires_in=\d+)/.exec(aLocationURI.ref);
                                                       if ( splitResult != null ) {
                                                         [, ldapInfoFacebook.access_token, ldapInfoFacebook.expires ] = splitResult;
                                                       }
                                                       tabmail.closeTab(newtab);
                                                       querying = false;
                                                     }
                                                   };
                                                 }
        });
  },
  cleanup: function() {
    //access_token = null; // don't clear token
    querying = false;
    expires = -1;
  }
}