 // Opera Wang, 2013/5/1
// GPL V3 / MPL
// debug utils
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfo"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/gloda/utils.js");
Cu.import("chrome://ldapInfo/content/ldapInfoFetch.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/aop.jsm");
Cu.import("chrome://ldapInfo/content/sprintf.jsm");

let ldapInfo = {
  mail2jpeg: {},
  mail2ldap: {},
  Wins: [],
  Init: function(aWindow) {
    try {
      // gMessageListeners only works for single message
      ldapInfoLog.log(2);
      this.Wins.push(aWindow);
      if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' ) {
        ldapInfoLog.log('hook');
        aWindow.hookedFunction = ldapInfoaop.after( {target: aWindow.MessageDisplayWidget, method: 'onLoadCompleted'}, function(result) {
          ldapInfo.showPhoto(this);
          return result;
        })[0];
      }
    }catch(err) {
      ldapInfoLog.logException(err);  
    }
  },
  unLoad: function(aWindow) {
    try {
      ldapInfoLog.log(3);
      let index = this.Wins.indexOf(aWindow);
      if ( index < 0 ) {
        ldapInfoLog.log('not my win');
        return;
      }
      this.Wins.splice(index, 1);
      if ( aWindow.hookedFunction ) {
        ldapInfoLog.log('unhook');
        aWindow.hookedFunction.unweave();
        aWindow.hookedFunction = null;
        delete aWindow.hookedFunction;
        if ( typeof(aWindow.ldapinfoCreatedElements) != 'undefined' ) {
          for ( let node of aWindow.ldapinfoCreatedElements ) {
            ldapInfoLog.log("remove node " + node);
            if ( node && node.parentNode ) {
              let b = node.parentNode.removeChild(node);
              ldapInfoLog.log("removed node " + b);
            }
          }
          delete aWindow.ldapinfoCreatedElements;
        }
      }
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
    ldapInfoLog.log('unload done');
  },
  cleanup: function() {
    try {
      ldapInfoSprintf.sprintf.cache = null;
      ldapInfoSprintf.sprintf = null;
      this.mail2jpeg = this.mail2ldap = this.Wins = null;
      ldapInfoFetch.clearCache();
      Cu.unload("chrome://ldapInfo/content/aop.jsm");
      Cu.unload("chrome://ldapInfo/content/sprintf.jsm");
      Cu.unload("chrome://ldapInfo/content/ldapInfoFetch.jsm");
      Cu.unload("chrome://ldapInfo/content/log.jsm");
      ldapInfoLog = ldapInfoaop = ldapInfoFetch = ldapInfoSprintf = null;
      Services.console.logStringMessage('unload done');
    } catch (err) {
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
      if ( !folderDisplay.msgWindow || !folderDisplay.displayedFolder ) return;
      let win = folderDisplay.msgWindow.domWindow;
      let folderURL = folderDisplay.displayedFolder.folderURL; // 'imap://user@server.comany.com/INBOX'
      let selectMessage = folderDisplay.selectedMessages[0];
      if ( !win || !folderURL || typeof(selectMessage) == 'undefined' ) return;
      // expandedHeadersBottomBox => otherActionsBox, expandedHeadersTopBox => expandedHeaders
      // headingwrapper => header-view-toolbox .. => hdrArchiveButton
      let id = 'displayLDAPPhoto';
      let refId = 'otherActionsBox';
      let doc = win.document;
      if ( !aMessageDisplayWidget.displayedMessage ) {
        id = 'displayLDAPPhotoMultiView';
        refId = 'hdrArchiveButton';
        let browser = doc.getElementById('multimessage');
        if ( !browser || !browser._docShell ) return;
        doc = browser._docShell.QueryInterface(Ci.nsIDocShell).contentViewer.DOMDocument;
      }
      let image = doc.getElementById(id);
      if ( !image ) {
        let refEle = doc.getElementById(refId);
        if ( !refEle ){
          ldapInfoLog.log("can't find ref " + refId);
          return;
        }
        // use XUL image element for chrome://generic.png
        image = doc.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "image");
        let newele = refEle.parentNode.insertBefore(image, refEle);
        image.id = id;
        image.maxHeight = 64;
        //image.height = 32;
        //image.style.height=32;
        //image.style.maxHeight=64;
        if ( typeof(win.ldapinfoCreatedElements) == 'undefined' )
          win.ldapinfoCreatedElements = [];
        win.ldapinfoCreatedElements.push(image);
      }
      image.src="chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png";
      image.ldap = {};
      let address = GlodaUtils.parseMailAddresses(selectMessage.mime2DecodedAuthor).addresses[0].toLowerCase();
      let match = address.match(/(\S+)@(\S+)/);
      if ( match.length == 3 ) {
        let [, mailID, mailDomain] = match;
        if ( folderURL.indexOf('.'+mailDomain+'/') <= 0 ) return;
        ldapInfoLog.log(mailID);
        let imagesrc = ldapInfo.mail2jpeg[address];
        if ( typeof(imagesrc) == 'undefined' ) {
          //(objectclass=*)
          // filter: (|(mail=*spe*)(cn=*spe*)(givenName=*spe*)(sn=*spe*))
          // attributes: comma seperated string
          let attributes = 'jpegPhoto,telephoneNumber,pager,mobile,url,employeeNumber,mail,cn';
          //attributes = null;
          let l = ldapInfoFetch.fetchLDAPInfo('directory', 'o='+mailDomain, null, 'mail='+address, attributes, image, function () {
            ldapInfoLog.log('callback');
            if ( typeof(image.ldap) != 'undefined' && typeof(image.ldap['_dn']) != 'undefined' ) {
              ldapInfoLog.log('callback valid');
              let attr2img = 'employeeNumber';
              if ( image.src.indexOf('chrome://') == 0 && typeof(image.ldap[attr2img]) != 'undefined') {
                image.src = ldapInfoSprintf.sprintf( "http://lookup/lookup/securephoto/%08s.jpg", image.ldap[attr2img] );
              }
              ldapInfo.mail2jpeg[address] = image.src;
              ldapInfo.mail2ldap[address] = image.ldap;
            }
          });
        } else {
          ldapInfoLog.log('use cached info');
          image.src = imagesrc;
          image.ldap = ldapInfo.mail2ldap[address];
        }
      }
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
};

    