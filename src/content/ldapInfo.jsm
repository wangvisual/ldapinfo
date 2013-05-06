// Opera Wang, 2010/1/15
// GPL V3 / MPL
// debug utils
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfo"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/gloda/utils.js");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/aop.jsm");
Cu.import("chrome://ldapInfo/content/sprintf.jsm");

const sprintf = ldapInfoSprintf.sprintf;

const LDAPURLContractID = "@mozilla.org/network/ldap-url;1";  
const nsILDAPSyncQuery = Ci.nsILDAPSyncQuery;  
const LDAPSyncQueryContractID = "@mozilla.org/ldapsyncquery;1";

let ldapInfo = {
  hookedFunction: null,
  mail2ID: {},
  mail2jpeg: {},
  Init: function(aWindow) {
    try {
      // gMessageListeners.push only works for single message
      ldapInfoLog.log(2);
      this.hookedFunction = ldapInfoaop.after( {target: aWindow.MessageDisplayWidget.prototype, method: 'onLoadCompleted'}, function(result) {
        //ldapInfoLog.logObject(this,"this",0);
        //ldapInfoLog.logObject(this.folderDisplay,"this.folderDisplay",1);
        ldapInfo.showPhoto(this);
        return result;
      })[0];
    }catch(err) {
      ldapInfoLog.logException(err);  
    }
  },
  unLoad: function(aWindow) {
    ldapInfoLog.log(3);
    if ( this.hookedFunction ) {
      ldapInfoLog.log('unhook');
      this.hookedFunction.unweave();
      this.hookedFunction = null;
    }
  },
  getLDAPValue: function (str, key) {
    try {
      if (str == null || key == null) return null;
      var search_key = "\n" + key + "=";
      var start_pos = str.indexOf(search_key);
      if (start_pos == -1) return null;
      start_pos += search_key.length;
      var end_pos = str.indexOf("\n", start_pos);
      if (end_pos == -1) end_pos = str.length;
      return str.substring(start_pos, end_pos);
    } catch(err) {
      ldapInfoLog.logException(err);  
    }
  },
  getLDAPAttributes: function(host, base, filter, attribs) {
    try {  
      let urlSpec = "ldap://" + host + "/" + base + "?" + attribs + "?sub?" +  filter;
      let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
      let ldapquery = Cc[LDAPSyncQueryContractID].createInstance(nsILDAPSyncQuery);  
      let gVersion = Ci.nsILDAPConnection.VERSION3;
      return ldapquery.getQueryResults(url, gVersion);
    }catch(err) {  
      ldapInfoLog.logException(err);  
    }  
  },
  showPhoto: function(aMessageDisplayWidget) {
    try {
      //aMessageDisplayWidget.folderDisplay.selectedMessages array of nsIMsgDBHdr, can be 1
      //                                   .selectedMessageUris array of uri
      //                     .displayedMessage null if mutil, nsImsgDBHdr =>mime2DecodedAuthor,mime2DecodedRecipients [string]
      ldapInfoLog.log("showPhoto4");
      if ( !aMessageDisplayWidget || !aMessageDisplayWidget.folderDisplay ) return;
      let folderDisplay = aMessageDisplayWidget.folderDisplay;
      let win = folderDisplay.msgWindow.domWindow;
      let folderURL = folderDisplay.displayedFolder.folderURL; // 'imap://user@server.comany.com/INBOX'
      let selectMessage = folderDisplay.selectedMessages[0];
      if ( typeof(selectMessage) == 'undefined' ) return;
      // expandedHeadersBottomBox => otherActionsBox, expandedHeadersTopBox => expandedHeaders
      // headingwrapper => header-view-toolbox
      let id = 'displayLDAPPhoto';
      let refId = 'otherActionsBox';
      if ( !aMessageDisplayWidget.displayedMessage ) {
        id = 'displayLDAPPhotoMultiView';
        refId = 'header-view-toolbox';
      }
      let image = win.document.getElementById(id);
      if ( !image ) {
        image = win.document.createElement("image");
        let refEle = win.document.getElementById(refId);
        if ( !refEle ) return;
        refEle.parentNode.insertBefore(image, refEle);
        image.id = id;
        image.maxHeight = 64;
        //image.height = 32;
        //image.style.height=32;
        //image.style.maxHeight=64;
      }
      image.src="chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png";
      let address = GlodaUtils.parseMailAddresses(selectMessage.mime2DecodedAuthor).addresses[0].toLowerCase();
      let match = address.match(/(\S+)@(\S+)/);
      if ( match.length == 3 ) {
        let [, mailID, mailDomain] = match;
        if ( folderURL.indexOf('.'+mailDomain+'/') <= 0 ) return;
        ldapInfoLog.log(mailID);
        let employeeNumber = ldapInfo.mail2ID[mailID];
        if ( typeof(employeeNumber) == 'undefined' ) {
          //(objectclass=*)
          let l = ldapInfo.getLDAPAttributes('directory','o='+mailDomain,'uid='+mailID,'jpegPhoto,telephoneNumber,pager,mobile,url,employeeNumber');
          employeeNumber = ldapInfo.getLDAPValue(l,'employeeNumber');
          ldapInfoLog.logObject(l,'l',0);
          ldapInfo.mail2ID[mailID] = employeeNumber;
        }
        if ( employeeNumber ) {
          image.src = sprintf( "http://lookup/lookup/securephoto/%08s.jpg", employeeNumber );
        }
      }
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
};

    