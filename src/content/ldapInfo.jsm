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
const tooltipGridID = "ldapinfo-tooltip-grid";
const tooltipRowsID = "ldapinfo-tooltip-rows";
const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

let ldapInfo = {
  mail2jpeg: {},
  mail2ldap: {},
  createPopup: function(doc) {
    /*
    <popupset id="mainPopupSet">
      <panel id="ldapinfo-tooltip" noautohide="true" position="start_before" onclick="alert(1);">
        <grid id="ldapinfo-tooltip-grid">
          <columns id="ldapinfo-tooltip-columns">
            <column/>
            <column/>
          </columns>
          <rows id="ldapinfo-tooltip-rows">
          </rows>
        </grid>
      </panel>
    </popupset>
    </overlay>
    */
    let mainPopupSet = doc.getElementById('mainPopupSet');
    if ( !mainPopupSet ) return;
    let panel = doc.createElementNS(XULNS, "panel");
    panel.id = tooltipID;
    panel.position = 'start_before';
    panel.setAttribute('noautohide', true);
    let grid = doc.createElementNS(XULNS, "grid");
    grid.id = tooltipGridID;
    let columns = doc.createElementNS(XULNS, "columns");
    let column1 = doc.createElementNS(XULNS, "column");
    let column2 = doc.createElementNS(XULNS, "column");
    let rows = doc.createElementNS(XULNS, "rows");
    rows.id = tooltipRowsID;
    columns.insertBefore(column1, null);
    columns.insertBefore(column2, null);
    grid.insertBefore(columns, null);
    grid.insertBefore(rows, null);
    panel.insertBefore(grid, null);
    mainPopupSet.insertBefore(panel, null);
  },
  
  Load: function(aWindow) {
    try {
      // gMessageListeners only works for single message
      ldapInfoLog.log(2);
      if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' ) {
        let doc = aWindow.document;
        if ( typeof(aWindow.ldapinfoCreatedElements) == 'undefined' ) aWindow.ldapinfoCreatedElements = [];
        // https://bugzilla.mozilla.org/show_bug.cgi?id=330458
        // aWindow.document.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null); // async load
        this.createPopup(aWindow.document);
        let targetObject = aWindow.MessageDisplayWidget;
        if ( typeof(aWindow.StandaloneMessageDisplayWidget) != 'undefined' ) targetObject = aWindow.StandaloneMessageDisplayWidget; // single window message display
        ldapInfoLog.log('hook' + targetObject);
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
      if ( aWindow.hookedFunction ) {
        ldapInfoLog.log('unhook');
        aWindow.hookedFunction.unweave();
        delete aWindow.hookedFunction;
        let doc = aWindow.document;
        aWindow.ldapinfoCreatedElements.push(tooltipID);
        for ( let node of aWindow.ldapinfoCreatedElements ) {
          ldapInfoLog.log("remove node " + node);
          if ( typeof(node) == 'string' ) node = doc.getElementById(node);
          if ( node && node.parentNode ) {
            ldapInfoLog.log("removed node " + node);
            node.parentNode.removeChild(node);
          }
        }
        delete aWindow.ldapinfoCreatedElements;
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
      this.mail2jpeg = this.mail2ldap = null;
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
  
  showAddtionalInfo:function(image, aWindow) {
    let rows = aWindow.document.getElementById(tooltipRowsID);
    ldapInfoLog.log(rows);
    if ( !rows ) return;
    // remove old tooltip
    while (rows.firstChild) {
      rows.removeChild(rows.firstChild);
    }
    for ( let p in image.ldap ) {
      if ( typeof(image.ldap[p]) != 'undefined' && image.ldap[p].length > 0 ) {
        ldapInfoLog.log('xx ' + p + ":" + image.ldap[p]);
        let row = aWindow.document.createElementNS(XULNS, "row");
        let col1 = aWindow.document.createElementNS(XULNS, "description");
        let col2 = aWindow.document.createElementNS(XULNS, "description");
        col1.setAttribute('value', p);
        col2.setAttribute('value', image.ldap[p]);
        col2.addEventListener('click', function(event){ldapInfoLog.log(event,'click2');}, false);
        row.insertBefore(col1, null);
        row.insertBefore(col2, null);
        rows.insertBefore(row, null);
      }
    }
    //image.tooltipText = "7\n8\r9&#13;10\r\n11"; // works, but no \n for multi-mail-view
    //image.setAttribute("tooltiptext", "7\n8\r9&#13;10\r\n11"); // works, but no \n for multi-mail-view
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
      let isSingle = aMessageDisplayWidget.singleMessageDisplay;
      if ( !isSingle ) {
        id = 'displayLDAPPhotoMultiView';
        refId = 'messagepanebox';
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
        vbox.id = id + '_vbox';
        vbox.insertBefore(image, null);
        refEle.parentNode.insertBefore(vbox, isSingle ? refEle : null);
        win.ldapinfoCreatedElements.push(vbox.id);
        image.id = id;
        image.maxHeight = 64;
        image.tooltip = tooltipID;
      }
      let mbox = doc.getElementById('displayLDAPPhotoMultiView_vbox');
      if ( mbox ) mbox.hidden = isSingle;
      image.src = "chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png";
      image.ldap = {};
      ldapInfo.showAddtionalInfo(image, win); // clear tooltip info if user trigger it now
      
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
            } else {
              ldapInfoLog.log('callback failed');
            }
            ldapInfo.showAddtionalInfo(image, win);
          });
        } else {
          ldapInfoLog.log('use cached info');
          image.src = imagesrc;
          image.ldap = ldapInfo.mail2ldap[address];
          ldapInfo.showAddtionalInfo(image, win);
        }
      }
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
};

    