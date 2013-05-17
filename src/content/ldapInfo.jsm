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

const tooltipID = 'ldapinfo-tooltip';
const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// https://bugzilla.mozilla.org/show_bug.cgi?id=330458
let OverlayLoader = {
  queue: [],
  loading: false,

  add: function(url,id) {    
    OverlayLoader.queue.push([url,id]);
  },

  load: function(win, doc) {
    if (OverlayLoader.queue.length == 0) return;
    if (!OverlayLoader.loading) {
      OverlayLoader.loading = true;      
      doc.loadOverlay(OverlayLoader.queue[0][0], null);
    } else {
      if (doc.getElementById(OverlayLoader.queue[0][1]) != null) {  
        OverlayLoader.loading = false;
        OverlayLoader.queue.shift();
        if (OverlayLoader.queue.length == 0) return;
      }
    }
    win.setTimeout( function() { OverlayLoader.load(win, doc); }, 100);
  }
};

let ldapInfo = {
  mail2jpeg: {},
  mail2ldap: {},
  //Wins: [],
  Init: function(aWindow) {
    try {
      // gMessageListeners only works for single message
      ldapInfoLog.log(2);
      //this.Wins.push(aWindow);
      if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' ) {
        if ( typeof(aWindow.ldapinfoCreatedElements) == 'undefined' ) aWindow.ldapinfoCreatedElements = [];
        // aWindow.document.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null); // async load
        OverlayLoader.add('chrome://ldapInfo/content/ldapInfo.xul', tooltipID);
        OverlayLoader.load(aWindow, aWindow.document);
        ldapInfoLog.log('hook');
        let targetObject = aWindow.MessageDisplayWidget;
        if ( typeof(aWindow.StandaloneMessageDisplayWidget) != 'undefined' ) targetObject = aWindow.StandaloneMessageDisplayWidget; // single window message display
        ldapInfoLog.log(targetObject);
        aWindow.hookedFunction = ldapInfoaop.after( {target: targetObject, method: 'onLoadCompleted'}, function(result) {
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
      //let index = this.Wins.indexOf(aWindow);
      //if ( index < 0 ) {
      //  ldapInfoLog.log('not my win');
      //  return;
      //}
      //this.Wins.splice(index, 1);
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
            }
          }
          delete aWindow.ldapinfoCreatedElements;
          delete aWindow.ldapinfoTooltip;
        }
        let doc = aWindow.document;
        let aHTMLTooltip = doc.getElementById("aHTMLTooltip");
        aHTMLTooltip.removeEventListener("popupshowing", ldapInfo.asdf, true);
        let css = doc.getElementById("ldapInfo.css");
        ldapInfoLog.logObject(css,'css',0);
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
      this.mail2jpeg = this.mail2ldap /*= this.Wins*/ = null;
      ldapInfoFetch.cleanup();
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
  
  showAddtionalInfo:function(image, aWindow, isSingle) {
    let rows = aWindow.document.getElementById("ldapinfo-tooltip-rows");
    if ( !rows || !aWindow.ldapinfoTooltip ) return;
    //ldapInfoLog.logObject(rows,'rows',0);
    // remove old tooltip
    while (rows.firstChild) {
      rows.removeChild(rows.firstChild);
    }
    //let simpleTooltip = "<pre><table>";
    for ( let p in image.ldap ) {
      if ( typeof(image.ldap[p]) != 'undefined' && image.ldap[p].length > 0 ) {
        ldapInfoLog.log('xx ' + p + ":" + image.ldap[p]);
        let row = aWindow.document.createElementNS(XULNS, "row");
        let col1 = aWindow.document.createElementNS(XULNS, "description");
        let col2 = aWindow.document.createElementNS(XULNS, "description");
        col1.setAttribute('value', p);
        col2.setAttribute('value', image.ldap[p]);
        row.insertBefore(col1, null);
        row.insertBefore(col2, null);
        rows.insertBefore(row, null);
        //simpleTooltip += "<tr><td>" + p + "</td><td>" + image.ldap[p] + "</td></tr>\n&#13;";
      }
    }
    //simpleTooltip += "</table></pre>";
    //image.tooltipText = "7\n8\r9&#13;10\r\n11"; // works, but no \n for multi-mail-view
    //image.setAttribute("tooltiptext", "7\n8\r9&#13;10\r\n11"); // works, but no \n for multi-mail-view
    if ( !isSingle) {
      image.tooltipText = "!!"; // will be replaced by my event listener
    }
  },
  
  asdf: function(event) {
    ldapInfoLog.log('asdf');
    let doc = event.view.document;
    //ldapInfoLog.logObject(doc,'doc',0);
    let aHTMLTooltip = doc.getElementById("aHTMLTooltip");
    ldapInfoLog.log(aHTMLTooltip);
    let ndList = aHTMLTooltip.childNodes;
    for (let i = 0; i < ndList.length; i++) {
      if ( ndList[i].class != 'tooltip-label' ) {
        ldapInfoLog.log('remove');
        aHTMLTooltip.removeChild(ndList[i]);
        i--;
      }
    }
    let triggerNode = event.target.triggerNode;
    ldapInfoLog.log(triggerNode);
    ldapInfoLog.log(triggerNode.id);
    if ( triggerNode.id != 'displayLDAPPhotoMultiView' ) return true;
    let grid = doc.getElementById(tooltipID).firstChild;
    aHTMLTooltip.insertBefore(grid.cloneNode(true), aHTMLTooltip.firstChild);
    aHTMLTooltip.label = "";
    ldapInfoLog.log('end');
    event.stopPropagation();
    return true;
  },

  showPhoto: function(aMessageDisplayWidget) {
    try {
      //aMessageDisplayWidget.folderDisplay.selectedMessages array of nsIMsgDBHdr, can be 1
      //                                   .selectedMessageUris array of uri
      //                     .displayedMessage null if mutil, nsImsgDBHdr =>mime2DecodedAuthor,mime2DecodedRecipients [string]
      ldapInfoLog.log("showPhoto4");
      ldapInfoLog.logObject(aMessageDisplayWidget,'aMessageDisplayWidget', 0);
      if ( !aMessageDisplayWidget || !aMessageDisplayWidget.folderDisplay ) return;
      ldapInfoLog.log("showPhoto6");
      let folderDisplay = aMessageDisplayWidget.folderDisplay;
      if ( !folderDisplay.msgWindow || !folderDisplay.displayedFolder ) return;
      ldapInfoLog.log("showPhoto7");
      let win = folderDisplay.msgWindow.domWindow;
      let folderURL = folderDisplay.displayedFolder.folderURL; // 'imap://user@server.comany.com/INBOX'
      let selectMessage = folderDisplay.selectedMessages[0];
      if ( !win || !folderURL || typeof(selectMessage) == 'undefined' ) return;
      ldapInfoLog.log("showPhoto8");
      // expandedHeadersBottomBox => otherActionsBox, expandedHeadersTopBox => expandedHeaders
      // headingwrapper => header-view-toolbox .. => hdrArchiveButton
      let id = 'displayLDAPPhoto';
      let refId = 'otherActionsBox';
      let doc = win.document;
      //doc.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null);
      let isSingle = true;
      if ( !aMessageDisplayWidget.displayedMessage ) {
        id = 'displayLDAPPhotoMultiView';
        refId = 'hdrArchiveButton';
        isSingle = false;
        let browser = doc.getElementById('multimessage');
        if ( !browser || !browser._docShell ) return;
        doc = browser._docShell.QueryInterface(Ci.nsIDocShell).contentViewer.DOMDocument;
      }
      if ( typeof(win.ldapinfoTooltip) == 'undefined' ) {
        let tooltip = win.document.getElementById(tooltipID);
        if ( tooltip ) {
          win.ldapinfoTooltip = tooltip;
          win.ldapinfoCreatedElements.push(tooltip);
        }
      }
      let image = doc.getElementById(id);
      if ( !image ) {
        let refEle = doc.getElementById(refId);
        if ( !refEle ){
          ldapInfoLog.log("can't find ref " + refId);
          return;
        }
        // use XUL image element for chrome://generic.png
        // image within html doc won't ask password
        image = doc.createElementNS(XULNS, "image");
        let vbox = doc.createElementNS(XULNS, "vbox"); // use box to prevent image stretch for single mail display
        vbox.insertBefore(image, null);
        refEle.parentNode.insertBefore(vbox, refEle);
        win.ldapinfoCreatedElements.push(vbox);
        if ( !isSingle ) {
          let aHTMLTooltip = win.document.getElementById("aHTMLTooltip");
          aHTMLTooltip.addEventListener("popupshowing", ldapInfo.asdf, true);
          //ldapInfoLog.logObject(aHTMLTooltip, 'aHTMLTooltip', 0);
        }
        image.id = id;
        image.maxHeight = 64;
        image.tooltip = tooltipID;
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
              ldapInfoLog.log('callback valids');
              let attr2img = 'employeeNumber';
              if ( image.src.indexOf('chrome://') == 0 && typeof(image.ldap[attr2img]) != 'undefined') {
                image.src = ldapInfoSprintf.sprintf( "http://lookup/lookup/securephoto/%08s.jpg", image.ldap[attr2img] );
              }
              ldapInfo.mail2jpeg[address] = image.src;
              ldapInfo.mail2ldap[address] = image.ldap;
              ldapInfo.showAddtionalInfo(image, win, isSingle);
            } else {
              ldapInfoLog.log('callback failed');
              ldapInfo.showAddtionalInfo(image, win, isSingle);
            }
          });
        } else {
          ldapInfoLog.log('use cached info');
          image.src = imagesrc;
          image.ldap = ldapInfo.mail2ldap[address];
          ldapInfo.showAddtionalInfo(image, win, isSingle);
        }
      }
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
};

    