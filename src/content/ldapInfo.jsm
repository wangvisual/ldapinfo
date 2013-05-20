 // Opera Wang, 2013/5/1
// GPL V3 / MPL
// debug utils
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfo"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/gloda/utils.js");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoFetch.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/aop.jsm");
Cu.import("chrome://ldapInfo/content/sprintf.jsm");

const tooltipID = 'ldapinfo-tooltip';
const tooltipGridID = "ldapinfo-tooltip-grid";
const tooltipRowsID = "ldapinfo-tooltip-rows";
const popupsetID = 'ldapinfo-popupset';
const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

let ldapInfo = {
  mail2jpeg: {},
  mail2ldap: {},
  PopupShowing: function(event) {
    try{
      //ldapInfoLog.logObject(event, 'event', 0);
      let triggerNode = event.target.triggerNode;
      let doc = event.view.document;
      ldapInfo.updatePopupInfo(triggerNode, triggerNode.ownerDocument.defaultView.window);
      //ldapInfoLog.log(triggerNode);
      ldapInfoLog.log(triggerNode.id);
      //ldapInfoLog.log(doc);
    } catch (err) {
      ldapInfoLog.logException(err);
    }
    return true;
  },

  createPopup: function(aWindow) {
    /*
    <popupset id="ldapinfo-popupset">
      <panel id="ldapinfo-tooltip" noautohide="true" noautofocus="true" position="start_before" ...">
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
    let doc = aWindow.document;
    let popupset = doc.createElementNS(XULNS, "popupset");
    popupset.id = popupsetID;
    let panel = doc.createElementNS(XULNS, "panel");
    panel.id = tooltipID;
    panel.position = 'start_before';
    panel.setAttribute('noautohide', true);
    panel.setAttribute('noautofocus', true);
    panel.setAttribute('titlebar', 'normal');
    panel.setAttribute('label', 'Contact Information');
    panel.setAttribute('close', true);
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
    popupset.insertBefore(panel, null);
    doc.documentElement.insertBefore(popupset, null);
    panel.addEventListener("popupshowing", ldapInfo.PopupShowing, true);
  },
  
  getPhotoFromAB: function(mail, image) {
    ldapInfoLog.log('try ab');
    let found = false, card = null;
    try {
      let abManager = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager);
      let allAddressBooks = abManager.directories;
      while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext().QueryInterface(Ci.nsIAbDirectory);
        if ( addressBook instanceof Ci.nsIAbDirectory && !addressBook.isRemote ) {
          try {
            card = addressBook.cardForEmailAddress(mail); // case-insensitive && sync
          } catch (err) {}
          if ( card ) {
            let PhotoType = card.getProperty('PhotoType', "");
            if ( ['file', 'web'].indexOf(PhotoType) < 0 ) continue;
            let PhotoURI = card.getProperty('PhotoURI', ""); // file://... or http://...
            let PhotoName = card.getProperty('PhotoName', ""); // filename under profiles/Photos/...
            if ( PhotoName ) {
              let file = FileUtils.getFile("ProfD", ['Photos', PhotoName]);
              if ( file.exists() ) { // use the one under profiles/Photos
                found = true;
                image.src = Services.io.newFileURI(file).spec;
              }
            } else if ( PhotoURI ) {
              image.src = PhotoURI;
              found = true;
            }
            if ( found ) {
              let pe = card.properties;
              while ( pe.hasMoreElements()) {
                let property = pe.getNext().QueryInterface(Ci.nsIProperty);
                let value = card.getProperty(property, "");
                image.ldap[property.name] = [property.value];
              }
            }
          }
        }
        if ( found ) break;
      }
    } catch (err) {
      ldapInfoLog.logException(err);
    }
    return found;
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
        this.createPopup(aWindow);
        let targetObject = aWindow.MessageDisplayWidget;
        if ( typeof(aWindow.StandaloneMessageDisplayWidget) != 'undefined' ) targetObject = aWindow.StandaloneMessageDisplayWidget; // single window message display
        ldapInfoLog.log('hook');
        aWindow.hookedFunction = ldapInfoaop.after( {target: targetObject, method: 'onLoadCompleted'}, function(result) { //onLoadStarted?
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
        aWindow.ldapinfoCreatedElements.push(popupsetID);
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
      this.clearCache();
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
  
  clearCache: function() {
    this.mail2jpeg = this.mail2ldap = {};
    ldapInfoFetch.clearCache();
  },
  
  updatePopupInfo:function(image, aWindow) {
    let rows = aWindow.document.getElementById(tooltipRowsID);
    if ( !rows ) return;
    // remove old tooltip
    while (rows.firstChild) {
      rows.removeChild(rows.firstChild);
    }
    for ( let p in image.ldap ) {
      for ( let v of image.ldap[p] ) {
        if ( v.length <=0 ) continue;
        let row = aWindow.document.createElementNS(XULNS, "row");
        let col1 = aWindow.document.createElementNS(XULNS, "description");
        let col2 = aWindow.document.createElementNS(XULNS, "description");
        col1.setAttribute('value', p);
        col2.setAttribute('value', v);
        col2.addEventListener('click', function(event){ldapInfoLog.log(event,'click2');}, false);
        row.insertBefore(col1, null);
        row.insertBefore(col2, null);
        rows.insertBefore(row, null);
      }
    }
    //image.tooltipText = "7\n8\r9&#13;10\r\n11"; // works, but no \n for multi-mail-view
    //image.setAttribute("tooltiptext", "7\n8\r9&#13;10\r\n11"); // works, but no \n for multi-mail-view
  },
  
  ldapCallback: function(aImg) {
    ldapInfoLog.log('callback');
    let my_address = aImg.address;
    if ( typeof(aImg.ldap) != 'undefined' && typeof(aImg.ldap['_dn']) != 'undefined' ) {
      ldapInfoLog.log('callback valids');
      let attr2img = 'employeeNumber';
      if ( !aImg.validImage && typeof(aImg.ldap[attr2img]) != 'undefined') {
        aImg.src = ldapInfoSprintf.sprintf( "http://lookup/lookup/securephoto/%08s.jpg", aImg.ldap[attr2img][0] );
        //aImg.validImage = true;
      }
      ldapInfo.mail2jpeg[my_address] = aImg.src;
      ldapInfo.mail2ldap[my_address] = aImg.ldap;
    } else { // fail to get info from ldap
      if ( aImg.validImage ) { // addressbook has photo
        ldapInfo.mail2ldap[my_address]['_Status'] = aImg.ldap['_Status'];
        aImg.ldap = ldapInfo.mail2ldap[my_address]; // value from addressbook
      }
      ldapInfoLog.log('callback failed');
    }
    //aImg.ownerDocument.defaultView.window
    //ldapInfo.updatePopupInfo(aImg, win);
  },

  showPhoto: function(aMessageDisplayWidget) {
    try {
      //aMessageDisplayWidget.folderDisplay.selectedMessages array of nsIMsgDBHdr, can be 1
      //                                   .selectedMessageUris array of uri
      //                     .displayedMessage null if mutil, nsImsgDBHdr =>mime2DecodedAuthor,mime2DecodedRecipients [string]
      ldapInfoLog.log("showPhoto4");
      if ( !aMessageDisplayWidget || !aMessageDisplayWidget.folderDisplay ) return;
      let folderDisplay = aMessageDisplayWidget.folderDisplay;
      if ( !folderDisplay.msgWindow ) return;
      let win = folderDisplay.msgWindow.domWindow;
      if ( !win ) return;
      let folderURL = {}; // [address:'imap://user@server.comany.com/INBOX']
      let addressList = [];
      for ( let selectMessage of folderDisplay.selectedMessages ) {
        for ( let address of GlodaUtils.parseMailAddresses(selectMessage.mime2DecodedAuthor).addresses ) {
          address = address.toLowerCase();
          if ( addressList.indexOf(address) < 0 ) {
            addressList.push(address);
            folderURL[address] = selectMessage.folder.folderURL;
          }
        }
        if ( addressList.length >= 10 ) break;
      }

      let id = 'displayLDAPPhoto';
      let refId = 'otherActionsBox';
      let doc = win.document;
      let isSingle = aMessageDisplayWidget.singleMessageDisplay;
      ldapInfoLog.log("is Single " + isSingle);
      if ( !isSingle ) {
        id = 'displayLDAPPhotoMultiView';
        refId = 'messagepanebox';
      }
      let box = doc.getElementById(id);
      if ( !box ) {
        let refEle = doc.getElementById(refId);
        if ( !refEle ){
          ldapInfoLog.log("can't find ref " + refId);
          return;
        }
        box = doc.createElementNS(XULNS, isSingle ? "hbox" : "vbox");
        box.id = id;
        refEle.parentNode.insertBefore(box, isSingle ? refEle : null);
        win.ldapinfoCreatedElements.push(box.id);
      } else {
        while (box.firstChild) {
          box.removeChild(box.firstChild);
        }
      }
      let mbox = isSingle ? doc.getElementById('displayLDAPPhotoMultiView') : box;
      if ( mbox ) mbox.collapsed = isSingle; // use hidden may not show images...

      for ( let address of addressList ) {
        ldapInfoLog.log('show image for ' + address);
        // use XUL image element for chrome://generic.png
        // image within html doc won't ask password
        let image = doc.createElementNS(XULNS, "image");
        let innerbox = doc.createElementNS(XULNS, isSingle ? "vbox" : "hbox"); // prevent from image resize
        innerbox.insertBefore(image, null);
        box.insertBefore(innerbox, null);
        //image.id = box.id + address;
        image.address = address;
        image.maxHeight = 64;
        image.tooltip = tooltipID;
        image.src = "chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png";
        image.validImage = false; // If ldap should get photo
        image.ldap = {_Status: ["Querying...", 'please wait']};
        ldapInfo.updatePopupInfo(image, win); // clear tooltip info if user trigger it now
        image.ldap = {};

        let imagesrc = ldapInfo.mail2jpeg[address];
        if ( typeof(imagesrc) != 'undefined' ) {
          image.src = imagesrc;
          ldapInfoLog.log('use cached info ' + image.src);
          image.ldap = ldapInfo.mail2ldap[address];
          image.ldap['_Status'] = ['Cached'];
          ldapInfo.updatePopupInfo(image, win);
          continue;
        }
        if ( ldapInfo.getPhotoFromAB(address, image) ) {
          ldapInfoLog.log("use address book photo " + image.src);
          image.validImage = true;
          ldapInfo.mail2jpeg[address] = image.src;
          ldapInfo.mail2ldap[address] = image.ldap; // maybe override by ldap
          ldapInfo.updatePopupInfo(image, win);
          image.ldap = {};
        }
        let match = address.match(/(\S+)@(\S+)/);
        if ( match.length == 3 ) {
          let [,, mailDomain] = match;
          if ( folderURL[address].indexOf('.'+mailDomain+'/') <= 0 ) {
            if ( !image.validImage ) {
              image.ldap = {_Status: ["No LDAP server avaiable"]};
              ldapInfo.updatePopupInfo(image, win);
            }
            continue;
          }
          //(objectclass=*)
          // filter: (|(mail=*spe*)(cn=*spe*)(givenName=*spe*)(sn=*spe*))
          // attributes: comma seperated string
          let attributes = 'cn,jpegPhoto,telephoneNumber,pager,mobile,facsimileTelephoneNumber,ou,snpsManagerChain,mail,snpsusermail,snpslistowner,title,Reports,snpsHireDate,employeeNumber,url';
          //attributes = null;
          ldapInfoFetch.fetchLDAPInfo('directory', 'o='+mailDomain, null, 'mail='+address, attributes, image, ldapInfo.ldapCallback);
        } // try ldap
      } // all addresses
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
};

    