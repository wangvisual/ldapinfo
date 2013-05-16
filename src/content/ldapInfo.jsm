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
        aWindow.document.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null); // async load
        if ( typeof(aWindow.ldapinfoCreatedElements) == 'undefined' )
          aWindow.ldapinfoCreatedElements = [];
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
        let aHTMLTooltip = aWindow.document.getElementById("aHTMLTooltip");
        aHTMLTooltip.removeEventListener("popupshowing", ldapInfo.asdf, true);
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
  },
  
  asdf: function(event) {
    ldapInfoLog.log('asdf');
    let doc = event.view.document;
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
    aHTMLTooltip.insertBefore(grid.parentNode.cloneNode(true), aHTMLTooltip.firstChild);
    aHTMLTooltip.label = grid;
    ldapInfoLog.log('end');
    event.preventDefault();
    event.stopPropagation();
    return true;
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
      //doc.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null);
      let isSingle = true;
      if ( !aMessageDisplayWidget.displayedMessage ) {
        id = 'displayLDAPPhotoMultiView';
        refId = 'hdrArchiveButton';
        isSingle = false;
        let browser = doc.getElementById('multimessage');
        if ( !browser || !browser._docShell ) return;
        doc = browser._docShell.QueryInterface(Ci.nsIDocShell).contentViewer.DOMDocument;
        /*let popupset = doc.createElementNS(XULNS, "popupset");
        let panel = doc.createElementNS(XULNS, "panel");
        panel.id = tooltipID;
        let description = doc.createElementNS(XULNS, "description");
        description.value = "2\n8\n";
        panel.insertBefore(description, null);
        popupset.insertBefore(panel, null);
        doc.body.insertBefore(popupset, null);
        panel.openPopup(image, "before_start", 0, 0, false, false);*/
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
        if ( ! isSingle ) {
          let aHTMLTooltip = win.document.getElementById("aHTMLTooltip");
          aHTMLTooltip.addEventListener("popupshowing", ldapInfo.asdf, true);
          ldapInfoLog.logObject(aHTMLTooltip, 'aHTMLTooltip', 0);
        }
        image.id = id;
        image.maxHeight = 64;
        image.tooltip = tooltipID;
        //image.height = 32;
        //image.style.height=32;
        //image.style.maxHeight=64;
      }
      image.src="chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png";
      image.ldap = {};
      //delete image.tooltipText;
      //image.setAttribute('tooltipText', null);
      
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

    