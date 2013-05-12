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

const LDAPURLContractID = "@mozilla.org/network/ldap-url;1";  
const nsILDAPSyncQuery = Ci.nsILDAPSyncQuery;  
const LDAPSyncQueryContractID = "@mozilla.org/ldapsyncquery;1";

let ldapInfo = {
  mail2ID: {},
  infoCache: {},
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
          //ldapInfoLog.logObject(this,"this",0);
          //ldapInfoLog.logObject(this.folderDisplay,"this.folderDisplay",1);
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
      ldapInfoLog.logObject(this.Wins,'Wins',0);
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
      this.infoCache = null;
      this.mail2jpeg = this.mail2ldap = null;
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
        //let employeeNumber = ldapInfo.mail2ID[mailID];
        //if ( typeof(employeeNumber) == 'undefined' ) {
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
          //let l = ldapInfo.getLDAPAttributes('directory','o='+mailDomain,'uid='+mailID,'jpegPhoto,telephoneNumber,pager,mobile,url,employeeNumber');
          //ldapInfoLog.log('get value');
          //employeeNumber = ldapInfo.getLDAPValue(l,'employeeNumber');
          //ldapInfoLog.log('get object');
          //ldapInfoLog.logObject(l,'l',0);
          //ldapInfo.mail2ID[mailID] = employeeNumber;
        } else {
          ldapInfoLog.log('use cached info');
          image.src = imagesrc;
          image.ldap = ldapInfo.mail2ldap[address];
        }
        //if ( employeeNumber ) {
          //image.src = ldapInfoSprintf.sprintf( "http://lookup/lookup/securephoto/%08s.jpg", employeeNumber );
        //}
      }
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
};

    