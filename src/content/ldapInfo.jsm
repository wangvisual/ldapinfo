// Opera Wang, 2013/5/1
// GPL V3 / MPL
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfo"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://app/modules/gloda/utils.js");
Cu.import("resource://gre/modules/FileUtils.jsm");
//Cu.import("resource://gre/modules/Dict.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoFetch.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/aop.jsm");
Cu.import("chrome://ldapInfo/content/sprintf.jsm");

const boxID = 'displayLDAPPhoto';
const tooltipID = 'ldapinfo-tooltip';
const tooltipGridID = "ldapinfo-tooltip-grid";
const tooltipRowsID = "ldapinfo-tooltip-rows";
const popupsetID = 'ldapinfo-popupset';
const addressBookImageID = 'cvPhoto';
const addressBookDialogImageID = 'photo';
const composeWindowInputID = 'addressingWidget';
const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

let ldapInfo = {
  mail2jpeg: {},
  mail2ldap: {},
  ldapServers: {},
  getLDAPFromAB: function() {
    try {
      let abManager = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager);
      let allAddressBooks = abManager.directories;
      while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext().QueryInterface(Ci.nsIAbDirectory);
        if ( addressBook instanceof Ci.nsIAbLDAPDirectory && addressBook.isRemote && addressBook.lDAPURL ) {
          /* spec (string) 'ldap://directory.company.com/o=company.com??sub?(objectclass=*)'
             prePath (string) 'ldap://directory.company.com' ==> scheme://user:password@host:port
             hostPort (string) 'directory.company.com'
             host (string) 'directory.company.com'
             path (string) '/o=company.com??sub?(objectclass=*)'
             dn (string) 'o=company.com'
             attributes (string) ''
             filter (string) '(objectclass=*)'
             scope (number) 2
          */
          let ldapURL = addressBook.lDAPURL;
          if ( !ldapURL.prePath || !ldapURL.spec || !ldapURL.dn ) continue;
          this.ldapServers[ldapURL.prePath.toLowerCase()] = { baseDn:ldapURL.dn, spec:ldapURL.spec, prePath:ldapURL.prePath, host:ldapURL.host, scope:ldapURL.scope,
                                                              attributes:ldapURL.attributes, authDn:addressBook.authDn }; // authDn is binddn
        }
      }
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },

  PopupShowing: function(event) {
    try{
      //ldapInfoLog.logObject(event, 'event', 0);
      let doc = event.view.document;
      let triggerNode = event.target.triggerNode;
      let targetNode = triggerNode;
      let headerRow = false;
      ldapInfoLog.log('popup');
      if ( triggerNode.nodeName == 'mail-emailaddress' ){
        headerRow = true;
        let emailAddress = triggerNode.getAttribute('emailAddress').toLowerCase();
        let targetID = boxID + emailAddress;
        targetNode = doc.getElementById(targetID);
        ldapInfoLog.log('targetID ' + targetID + ":"+ targetNode);
      }
      if ( !targetNode ) {
        ldapInfoLog.log('bad node');
      } else {
        ldapInfoLog.log('good node');
        ldapInfoLog.log(targetNode.id);
      }
      ldapInfo.updatePopupInfo(targetNode, triggerNode.ownerDocument.defaultView.window, headerRow ? triggerNode : null);
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
    aWindow.ldapinfoCreatedElements.push(popupsetID);
  },

  displayHeaderListener : {
    onStartHeaders: function () {},
    onEndHeaders: function() {
      ldapInfoLog.log('onEndHeaders');
      let win = Services.wm.getMostRecentWindow("mail:3pane");
      // add, because the headers can be added when next email has more headers...
      if ( win && win.document ) ldapInfo.modifyTooltip4HeaderRows(win.document, true);
    },
    onEndAttachments: function () {}, 
  },

  modifyTooltip4HeaderRows: function(doc, load) {
    try  {
      ldapInfoLog.log('modifyTooltip4HeaderRows ' + load);
      // expandedHeadersBox ... [mail-multi-emailHeaderField] > longEmailAddresses > emailAddresses > [mail-emailaddress]
      let expandedHeadersBox = doc.getElementById('expandedHeadersBox');
      if ( !expandedHeadersBox ) return;
      let nodeLists = expandedHeadersBox.getElementsByTagName('mail-multi-emailHeaderField'); // Can't get anonymous elements directly
      for ( let node of nodeLists ) {
        if ( node.ownerDocument instanceof Ci.nsIDOMDocumentXBL ) {
          let XBLDoc = node.ownerDocument;
          let emailAddresses = XBLDoc.getAnonymousElementByAttribute(node, 'anonid', 'emailAddresses');
          for ( let mailNode of emailAddresses.childNodes ) {
            if ( mailNode.nodeType == mailNode.ELEMENT_NODE && mailNode.className != 'emailSeparator' ) { // maybe hidden
              if ( load ) { // load
                if ( !mailNode.hookedFunction ) {
                  mailNode.tooltip = tooltipID;
                  mailNode.tooltiptextSave = mailNode.tooltipText;
                  mailNode.removeAttribute("tooltiptext");
                  mailNode.hookedFunction = ldapInfoaop.around( {target: mailNode, method: 'setAttribute'}, function(invocation) {
                    if ( invocation.arguments[0] == 'tooltiptext' ) { // block it
                      this.tooltiptextSave = invocation.arguments[1];
                      return true;
                    }
                    return invocation.proceed(); 
                  })[0];
                }
              } else { // unload
                if ( mailNode.hookedFunction ) {
                  mailNode.hookedFunction.unweave();
                  delete mailNode.hookedFunction;
                  mailNode.setAttribute('tooltiptext', mailNode.tooltiptextSave);
                  delete mailNode.tooltiptextSave;
                  delete mailNode.tooltip;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },
  
  getPhotoFromAB: function(mail, callbackData) {
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
                callbackData.image.setAttribute('src', Services.io.newFileURI(file).spec);
              }
            } else if ( PhotoURI ) {
              callbackData.image.setAttribute('src', PhotoURI);
              found = true;
            }
            if ( found ) {
              let pe = card.properties;
              while ( pe.hasMoreElements()) {
                let property = pe.getNext().QueryInterface(Ci.nsIProperty);
                let value = card.getProperty(property, "");
                callbackData.ldap[property.name] = [property.value];
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
      ldapInfoLog.log("Load");
      let doc = aWindow.document;
      if ( typeof(aWindow.ldapinfoCreatedElements) == 'undefined' ) aWindow.ldapinfoCreatedElements = [];
      if ( typeof(aWindow.hookedFunctions) == 'undefined' ) aWindow.hookedFunctions = [];
      if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' ) { // messeage display window
        // https://bugzilla.mozilla.org/show_bug.cgi?id=330458
        // aWindow.document.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null); // async load
        let targetObject = aWindow.MessageDisplayWidget;
        if ( typeof(aWindow.StandaloneMessageDisplayWidget) != 'undefined' ) targetObject = aWindow.StandaloneMessageDisplayWidget; // single window message display
        ldapInfoLog.log('msg view hook');
        aWindow.hookedFunctions.push( ldapInfoaop.after( {target: targetObject, method: 'onLoadStarted'}, function(result) {
          ldapInfo.showPhoto(this);
          return result;
        })[0] );
        if ( typeof(aWindow.gMessageListeners) != 'undefined' ) { // this not work with multi mail view
          ldapInfoLog.log('gMessageListeners hook');
          aWindow.gMessageListeners.push(this.displayHeaderListener);
        }
      } else if ( typeof(aWindow.gPhotoDisplayHandlers) != 'undefined' && typeof(aWindow.displayPhoto) != 'undefined' ) { // address book
        ldapInfoLog.log('address book hook');
        aWindow.hookedFunctions.push( ldapInfoaop.around( {target: aWindow, method: 'displayPhoto'}, function(invocation) {
          let [aCard, aImg] = invocation.arguments; // aImg.src now maybe the pic of previous contact
          ldapInfoLog.log('mail: ' + aCard.primaryEmail);
          let win = aImg.ownerDocument.defaultView.window;
          let results = invocation.proceed();
          if ( aCard.primaryEmail && win ) {
            ldapInfo.updateImgWithAddress(aImg, aCard.primaryEmail.toLowerCase(), win);
          }
          return results;
        })[0] );
      } else if ( typeof(aWindow.gPhotoHandlers) != 'undefined' ) { // address book edit dialog
        ldapInfoLog.log('address book dialog hook');
        aWindow.hookedFunctions.push( ldapInfoaop.around( {target: aWindow.gPhotoHandlers['generic'], method: 'onShow'}, function(invocation) {
          let [aCard, aDocument, aTargetID] = invocation.arguments; // aCard, document, "photo"
          ldapInfoLog.log('mail: ' + aCard.primaryEmail);
          let aImg = aDocument.getElementById(aTargetID);
          let win = aDocument.defaultView.window;
          let type = aDocument.getElementById("PhotoType").value;
          let results = invocation.proceed();
          let address = aCard.primaryEmail.toLowerCase();
          delete ldapInfo.mail2jpeg[address]; // invalidate cache
          if ( ( type == 'generic' || type == "" ) && aCard.primaryEmail && win ) ldapInfo.updateImgWithAddress(aImg, address, win);
          delete ldapInfo.mail2jpeg[address]; // invalidate cache
          return results;
        })[0] );
      } else if ( typeof(aWindow.ComposeFieldsReady) != 'undefined' ) { // compose window
        ldapInfo.initComposeListener(doc);
        let docref = Cu.getWeakReference(doc);
        //ComposeFieldsReady will call listbox.parentNode.replaceChild(newListBoxNode, listbox);
        aWindow.hookedFunctions.push( ldapInfoaop.after( {target: aWindow, method: 'ComposeFieldsReady'}, function(result) {
          ldapInfoLog.log('ComposeFieldsReady');
          let nowdoc = docref.get();
          if ( nowdoc && nowdoc.getElementById ) ldapInfo.initComposeListener(nowdoc);
          return result;
        })[0] );
        // Compose Window can be recycled, and if it's closed, shutdown can't find it's aWindow and no unLoad is called
        // So we call unLoad when it's closed but become hidden
        if ( typeof(aWindow.gComposeRecyclingListener) != 'undefined' ) {
          ldapInfoLog.log('gComposeRecyclingListener hook');
          aWindow.hookedFunctions.push( ldapInfoaop.after( {target: aWindow.gComposeRecyclingListener, method: 'onClose'}, function(result) {
            ldapInfoLog.log('compose window onClose');
            ldapInfo.unLoad(aWindow);
            ldapInfoLog.log('compose window unLoad done');
            return result;
          })[0] );
        }
      }
      if ( aWindow.hookedFunctions.length ) {
        ldapInfoLog.log('create popup');
        this.createPopup(aWindow);
        aWindow.addEventListener("unload", ldapInfo.onUnLoad, false);
      }
    }catch(err) {
      ldapInfoLog.logException(err);
    }
  },
  
  initComposeListener: function(doc) {
    let input = doc.getElementById(composeWindowInputID);
    if ( input ) {
      ldapInfoLog.log('input listener');
      input.addEventListener('focus', ldapInfo.composeWinUpdate, true); // use capture as we are at top
      input.addEventListener('input', ldapInfo.composeWinUpdate, true);
    }
  },
  
  composeWinUpdate: function(event) {
    try {
      let cell = event.target;
      //ldapInfoLog.logObject(cell,'cell',0);
      // addressCol2#2
      let splitResult = /^addressCol([\d])#(\d+)/.exec(cell.id);
      if ( splitResult == null ) return;
      let [, col, row] = splitResult;
      if ( col == 1 ) cell = cell.parentNode.nextSibling.firstChild;
      let doc = cell.ownerDocument;
      if ( cell.value == '' && row > 1 ) cell = doc.getElementById('addressCol2#' + (row -1));
      ldapInfoLog.log('cell ' + cell.value);
      if ( cell.value == '' || cell.value.indexOf('@') < 0 ) return;
      
      let win = doc.defaultView;
      let imageID = boxID + 'compose';
      let image = doc.getElementById(imageID);
      if ( !image ) {
        let refId = 'attachments-box';
        let refEle = doc.getElementById(refId);
        if ( !refEle ){
          ldapInfoLog.log("can't find ref " + refId);
          return;
        }
        let box = doc.createElementNS(XULNS, "vbox");
        box.id = boxID;
        image = doc.createElementNS(XULNS, "image");
        box.insertBefore(image, null);
        refEle.parentNode.insertBefore(box, refEle);
        win.ldapinfoCreatedElements.push(boxID);
        image.id = imageID;
        image.maxHeight = 128;
        image.addEventListener('error', ldapInfo.loadImageFailed, false);
      }
      image.setAttribute('src', "chrome://messenger/skin/addressbook/icons/contact-generic.png");
      let email = GlodaUtils.parseMailAddresses(cell.value.toLowerCase()).addresses[0];
      ldapInfo.updateImgWithAddress(image, email, win);
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
  },
  
  onUnLoad: function(event) {
    ldapInfoLog.log('onUnLoad 0');
    let aWindow = event.currentTarget;
    if ( aWindow ) {
      ldapInfoLog.log('onUnLoad');
      ldapInfo.unLoad(aWindow);
    }
  },

  unLoad: function(aWindow) {
    try {
      ldapInfoLog.log('unload');
      if ( typeof(aWindow.hookedFunctions) != 'undefined' ) {
        ldapInfoLog.log('unhook');
        aWindow.removeEventListener("unload", ldapInfo.onUnLoad, false);
        aWindow.hookedFunctions.forEach( function(hooked) {
          hooked.unweave();
        } );
        delete aWindow.hookedFunctions;
        if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' && typeof(aWindow.gMessageListeners) != 'undefined' ) {
          ldapInfoLog.log('gMessageListeners unhook');
          let index = aWindow.gMessageListeners.indexOf(this.displayHeaderListener);
          if ( index >= 0 ) {
            ldapInfoLog.log('gMessageListeners unhook index ' + index);
            aWindow.gMessageListeners.splice(index, 1);
          }
        }
        let doc = aWindow.document;
        let input = doc.getElementById(composeWindowInputID);
        if ( input ) { // compose window
          ldapInfoLog.log('unload compose window listener');
          input.removeEventListener('focus', ldapInfo.composeWinUpdate, true);
          input.removeEventListener('input', ldapInfo.composeWinUpdate, true);
        }
        for ( let node of aWindow.ldapinfoCreatedElements ) {
          ldapInfoLog.log("remove node " + node);
          if ( typeof(node) == 'string' ) node = doc.getElementById(node);
          if ( node && node.parentNode ) {
            ldapInfoLog.log("removed node " + node);
            node.parentNode.removeChild(node);
          }
        }
        delete aWindow.ldapinfoCreatedElements;
        this.modifyTooltip4HeaderRows(doc, false); // remove
        let image = doc.getElementById(addressBookImageID);
        if ( !image ) image = doc.getElementById(addressBookDialogImageID);
        if ( image ) { // address book
          ldapInfoLog.log('unload addressbook image property');
          delete image.ldap;
          delete image.address;
          delete image.validImage;
          image.removeAttribute('tooltip');
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
      this.clearCache();
      ldapInfoFetch.cleanup();
      Cu.unload("chrome://ldapInfo/content/aop.jsm");
      Cu.unload("chrome://ldapInfo/content/sprintf.jsm");
      Cu.unload("chrome://ldapInfo/content/ldapInfoFetch.jsm");
      Cu.unload("chrome://ldapInfo/content/log.jsm");
      ldapInfoLog = ldapInfoaop = ldapInfoFetch = ldapInfoSprintf = null;
      Services.console.logStringMessage('cleanup done');
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
  },
  
  clearCache: function() {
    this.mail2jpeg = this.mail2ldap = this.ldapServers = {};
    ldapInfoFetch.clearCache();
  },
  
  updatePopupInfo:function(image, aWindow, headerRow) {
    try {
      ldapInfoLog.log('updatePopupInfo');
      if ( !aWindow || !aWindow.document ) return;
      let doc = aWindow.document;
      let tooltip = doc.getElementById(tooltipID);
      let rows = doc.getElementById(tooltipRowsID);
      if ( !rows || !tooltip || ['showing', 'open'].indexOf(tooltip.state) < 0 ) return;
      if ( tooltip.state == 'open' && typeof(tooltip.address) != 'undefined' && typeof(image) != 'undefined' && tooltip.address != image.address ) return;
      ldapInfoLog.log('updatePopupInfo 2');
      // remove old tooltip
      while (rows.firstChild) {
        rows.removeChild(rows.firstChild);
      }
      
      let ldap = {};
      if ( image != null && typeof(image) != 'undefined' ) {
        tooltip.address = image.address;
        if ( headerRow && image.src ) {
          ldapInfoLog.log('add image');
          ldap['_image'] = [image.src]; // so it will be the first one to show
        }
        ldap['_email'] = [image.address];
        for ( let i in image.ldap ) { // shadow copy
          ldap[i] = image.ldap[i];
        }
      } else if ( headerRow ) {
        ldap = { '': [headerRow.tooltiptextSave || ""] };
      }
      for ( let p in ldap ) {
        let r = 0;
        for ( let v of ldap[p] ) {
          if ( typeof(v) == 'undefined' || v.length <=0 ) continue;
          r++;
          if ( r >= 20 ) v = "...";
          let row = doc.createElementNS(XULNS, "row");
          let col1 = doc.createElementNS(XULNS, "description");
          let col2;
          if ( p == '_image' ) {
            col1.setAttribute('value', '');
            col2 = doc.createElementNS(XULNS, "hbox");
            let newImage = doc.createElementNS(XULNS, "image");
            newImage.setAttribute('src', v);
            newImage.maxHeight = 128;
            col2.insertBefore(newImage,null);
          } else {
            col1.setAttribute('value', p);
            col2 = doc.createElementNS(XULNS, "description");
            col2.setAttribute('value', v);
            if ( v.indexOf("://") >= 0 ) {
              col2.setAttribute('class', "ldapInfoPopupLink");
              col2.addEventListener('click', function(event){ldapInfoLog.log(event,'click2');}, false);
            }
          }
          row.insertBefore(col1, null);
          row.insertBefore(col2, null);
          rows.insertBefore(row, null);
          if ( r>= 20 ) break; // at most 10 rows for one ldap attribute
        }
      }
      ldapInfoLog.log('update done');
      //image.tooltipText = "7\n8\r9&#13;10\r\n11"; // works, but no \n for multi-mail-view
      //image.setAttribute("tooltiptext", "7\n8\r9&#13;10\r\n11"); // works, but no \n for multi-mail-view
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
  
  ldapCallback: function(callbackData) {
    ldapInfoLog.log('callback');
    let my_address = callbackData.address;
    let aImg = callbackData.image;
    delete aImg.ldap['_Status'];
    let succeed = false;

    if ( typeof(callbackData.ldap) != 'undefined' && typeof(callbackData.ldap['_dn']) != 'undefined' ) {
      ldapInfoLog.log('callback valids');
      succeed = true;
      let attr2img = 'employeeNumber';
      if ( !callbackData.validImage && typeof(callbackData.ldap[attr2img]) != 'undefined') {
        callbackData.src = ldapInfoSprintf.sprintf( "http://lookup/lookup/securephoto/%08s.jpg", callbackData.ldap[attr2img][0] );
        //callbackData.validImage = true;
      }
      ldapInfo.mail2jpeg[my_address] = callbackData.src;
      ldapInfo.mail2ldap[my_address] = callbackData.ldap;
    } else { // fail to get info from ldap
      if ( callbackData.validImage ) { // addressbook has photo
        ldapInfo.mail2ldap[my_address]['_Status'] = callbackData.ldap['_Status'];
        callbackData.ldap = ldapInfo.mail2ldap[my_address]; // value from addressbook
      }
      ldapInfoLog.log('callback failed');
    }
    if ( my_address == aImg.address ) {
      ldapInfoLog.log('same image');
      if ( succeed ) aImg.setAttribute('src', callbackData.src);
      aImg.ldap = callbackData.ldap;
      //aImg.validImage = callbackData.validImage;
    } else {
      ldapInfoLog.log('different image');
    }
    ldapInfo.updatePopupInfo(aImg, callbackData.win.get(), null);
  },
  
  loadImageFailed: function(event) {
    let aImg = event.target;
    if ( aImg && aImg.src.indexOf("chrome:") < 0 ) {
      aImg.setAttribute('src', 'chrome://messenger/skin/addressbook/icons/remote-addrbook-error.png');
      //aImg.validImage = false;
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
      if ( !folderDisplay.msgWindow ) return;
      let win = folderDisplay.msgWindow.domWindow;
      if ( !win ) return;
      let addressList = [];
      //let isSingle = aMessageDisplayWidget.singleMessageDisplay; // only works if loadComplete
      let isSingle = (folderDisplay.selectedCount <= 1);
      ldapInfoLog.log('isSingle ' + isSingle);
      let imageLimit = isSingle ? 36 : 12;
      for ( let selectMessage of folderDisplay.selectedMessages ) {
        let who = selectMessage.mime2DecodedAuthor;
        if ( isSingle ) who += ',' + GlodaUtils.deMime(selectMessage.getStringProperty("replyTo")) + ',' + selectMessage.mime2DecodedRecipients + ',' + GlodaUtils.deMime(selectMessage.ccList) + ',' + GlodaUtils.deMime(selectMessage.bccList);
        for ( let address of GlodaUtils.parseMailAddresses(who.toLowerCase()).addresses ) {
          if ( addressList.indexOf(address) < 0 ) {
            addressList.push(address);
          }
          if ( addressList.length >= imageLimit ) break;
        }
        if ( addressList.length >= imageLimit ) break;
      }

      let refId = 'otherActionsBox';
      let doc = win.document;
      if ( !isSingle ) refId = 'messagepanebox';
      let refEle = doc.getElementById(refId);
      if ( !refEle ){
        ldapInfoLog.log("can't find ref " + refId);
        return;
      }
      let box = doc.getElementById(boxID);
      if ( !box ) {
        box = doc.createElementNS(XULNS, "box");
        box.id = boxID;
        win.ldapinfoCreatedElements.push(boxID);
      } else {
        box.parentNode.removeChild(box);
        while (box.firstChild) {
          box.removeChild(box.firstChild);
        }
      }
      box.setAttribute('orient', isSingle ? 'horizontal' : 'vertical'); // use attribute so my css attribute selector works
      refEle.parentNode.insertBefore(box, isSingle ? refEle : null);
      
      for ( let address of addressList ) {
        ldapInfoLog.log('show image for ' + address);
        // use XUL image element for chrome://generic.png
        // image within html doc won't ask password
        let image = doc.createElementNS(XULNS, "image");
        let innerbox = doc.createElementNS(XULNS, isSingle ? "vbox" : "hbox"); // prevent from image resize
        innerbox.insertBefore(image, null);
        box.insertBefore(innerbox, null);
        image.id = boxID + address; // for header row to find me
        image.maxHeight = 64;
        image.setAttribute('src', "chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png");
        image.addEventListener('error', ldapInfo.loadImageFailed, false);
        ldapInfo.updateImgWithAddress(image, address, win);
      } // all addresses
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
  
  updateImgWithAddress: function(image, address, win) {
    // For address book, it reuse the same iamge, so can't use image as data container because user may quickly change the selected card
    let callbackData = { image: image, address: address, win: Cu.getWeakReference(win), validImage: false, ldap: {}, callback: ldapInfo.ldapCallback };
    image.address = address; // used in callback verification, still the same address?
    image.tooltip = tooltipID;
    image.ldap = {};
    ldapInfo.updatePopupInfo(image, win, null); // clear tooltip info if user trigger it now

    let imagesrc = ldapInfo.mail2jpeg[address];
    if ( typeof(imagesrc) != 'undefined' ) {
      image.setAttribute('src', imagesrc);
      ldapInfoLog.log('use cached info ' + image.src);
      image.ldap = ldapInfo.mail2ldap[address];
      image.ldap['_Status'] = ['Cached'];
      ldapInfo.updatePopupInfo(image, win, null);
      return;
    }
    if ( [addressBookImageID, addressBookDialogImageID].indexOf(image.id) >= 0 ) {
      if ( typeof(win.defaultPhotoURI) != 'undefined' && image.getAttribute('src') != win.defaultPhotoURI ) { // has photo, but not saving to mail2jpeg cache
        callbackData.validImage = true;
        ldapInfo.mail2ldap[address] = {_Status: ["Picture from Address book"]};
      }
    } else if ( ldapInfo.getPhotoFromAB(address, callbackData) ) {
      ldapInfoLog.log("use address book photo " + image.src);
      callbackData.validImage = true;
      ldapInfo.mail2jpeg[address] = image.src;
      ldapInfo.mail2ldap[address] = callbackData.ldap; // maybe override by ldap
      ldapInfo.updatePopupInfo(image, win, null);
      callbackData.ldap = {};
    }
    
    if ( Object.getOwnPropertyNames( ldapInfo.ldapServers ).length === 0 ) {
      ldapInfo.getLDAPFromAB();
    }
    
    let match = address.match(/(\S+)@(\S+)/);
    if ( match.length == 3 ) {
      let [, mailid, mailDomain] = match;
      let ldapServer;
      for ( let prePath in ldapInfo.ldapServers ){
        if ( prePath.indexOf('.' + mailDomain) >= 0 || ldapInfo.ldapServers[prePath]['baseDn'].indexOf(mailDomain) >= 0 ) {
          ldapServer = ldapInfo.ldapServers[prePath];
          break;
        }
      }
      if ( typeof(ldapServer) == 'undefined' ) {
        if ( !callbackData.validImage ) {
          image.ldap = {_Status: ["No LDAP server avaiable"]};
          ldapInfo.updatePopupInfo(image, win, null);
        }
        return;
      }
      image.ldap['_Status'] = ["Querying... please wait"];
      // attributes: comma seperated string
      let attributes = 'cn,jpegPhoto,thumbnailPhoto,photo,telephoneNumber,pager,mobile,facsimileTelephoneNumber,mobileTelephoneNumber,pagerTelephoneNumber,ou,snpsManagerChain,mail,snpsusermail,snpslistowner,title,Reports,manager,snpsHireDate,employeeNumber,employeeType,url';
      //attributes = null;
      // filter: (|(mail=*spe*)(cn=*spe*)(givenName=*spe*)(sn=*spe*))
      let filter = '(|(mail=' + address + ')(mailLocalAddress=' + address + ')(uid=' + mailid + '))';
      callbackData.src = image.src;
      for ( let i in image.ldap ) { // shadow copy
        if( i != '_Status' ) callbackData.ldap[i] = image.ldap[i];
      }
      ldapInfoFetch.queueFetchLDAPInfo(callbackData, ldapServer.host, ldapServer.prePath, ldapServer.baseDn, ldapServer.authDn, filter, attributes);
    } // try ldap
  },
};
