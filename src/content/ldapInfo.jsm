// Opera Wang, 2013/5/1
// GPL V3 / MPL
"use strict";
var EXPORTED_SYMBOLS = ["ldapInfo"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://app/modules/gloda/utils.js");
Cu.import("resource://gre/modules/FileUtils.jsm");
//Cu.import("resource://gre/modules/Dict.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoFetch.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoFetchOther.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoFacebook.jsm");
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
const lineLimit = 2048;

let ldapInfo = {
  mail2jpeg: {},
  mail2ldap: {},
  getLDAPFromAB: function() {
    try {
      this.ldapServers = {};
      let allAddressBooks = MailServices.ab.directories;
      let found = false;
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
          found = true;
          this.ldapServers[ldapURL.prePath.toLowerCase()] = { baseDn:ldapURL.dn, spec:ldapURL.spec, prePath:ldapURL.prePath, host:ldapURL.host, scope:ldapURL.scope,
                                                              attributes:ldapURL.attributes, authDn:addressBook.authDn }; // authDn is binddn
        }
      }
      // if ( Object.getOwnPropertyNames( this.ldapServers ).length === 0 ) {
      if ( !found ) ldapInfoLog.log("Can't find any LDAP servers in address book, please setup on first!", 'Error');
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },

  PopupShowing: function(event) {
    try{
      let doc = event.view.document;
      let triggerNode = event.target.triggerNode;
      let targetNode = triggerNode;
      let headerRow = false;
      if ( triggerNode.nodeName == 'mail-emailaddress' ){
        headerRow = true;
        let emailAddress = triggerNode.getAttribute('emailAddress').toLowerCase();
        let targetID = boxID + emailAddress;
        targetNode = doc.getElementById(targetID);
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
    column2.classList.add("ldapInfoPopupDetailColumn");
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

  modifyTooltip4HeaderRows: function(doc, load) {
    try  {
      ldapInfoLog.info('modifyTooltip4HeaderRows ' + load);
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
                if ( !mailNode.hookedFunctions ) {
                  mailNode.tooltip = tooltipID;
                  mailNode.tooltiptextSave = mailNode.tooltipText;
                  mailNode.removeAttribute("tooltiptext");
                  mailNode.hookedFunctions = [];
                  mailNode.hookedFunctions.push( ldapInfoaop.around( {target: mailNode, method: 'setAttribute'}, function(invocation) {
                    if ( invocation.arguments[0] == 'tooltiptext' ) { // block it
                      this.tooltiptextSave = invocation.arguments[1];
                      return true;
                    }
                    return invocation.proceed(); 
                  })[0] );
                  mailNode.hookedFunctions.push( ldapInfoaop.around( {target: mailNode, method: 'removeAttribute'}, function(invocation) {
                    if ( invocation.arguments[0] == 'tooltiptext' ) { // block it
                      delete this.tooltiptextSave;
                      return true;
                    }
                    return invocation.proceed(); 
                  })[0] );
                }
              } else { // unload
                if ( mailNode.hookedFunctions ) {
                  mailNode.hookedFunctions.forEach( function(hooked) {
                    hooked.unweave();
                  } );
                  delete mailNode.hookedFunctions;
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
  
  getPhotoFromABorLocalDir: function(mail, callbackData) {
    let found = false, card = null;
    let localDir = ldapInfoUtil.options['local_pic_dir'];
    if ( ldapInfoUtil.options['load_from_local_dir'] && localDir != '' ) {
      let suffixes = ['png', 'gif', 'jpg'];
      return suffixes.some( function(suffix) {
        let file = new FileUtils.File(localDir);
        file.appendRelativePath( mail + '.' + suffix );
        if ( file.exists() ) { // use the one under profiles/Photos
          found = true;
          callbackData.image.setAttribute('src', Services.io.newFileURI(file).spec);
          callbackData.ldap['_Status'] = ['From LocaDir'];
          return found;
        }
      } );
    }
    if ( !ldapInfoUtil.options['load_from_addressbook'] ) return found;
    try {
      let allAddressBooks = MailServices.ab.directories;
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
              callbackData.ldap['_Status'] = ['From Address Book'];
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
      ldapInfoLog.info("Load for " + aWindow.location.href);
      let doc = aWindow.document;
      let winref = Cu.getWeakReference(aWindow);
      let docref = Cu.getWeakReference(doc);
      if ( typeof(aWindow.ldapinfoCreatedElements) == 'undefined' ) aWindow.ldapinfoCreatedElements = [];
      if ( typeof(aWindow.hookedFunctions) == 'undefined' ) {
        aWindow.hookedFunctions = [];
      } else if ( aWindow.hookedFunctions.length ) {
        ldapInfoLog.info("Already loaded, return");
      }
      if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' ) { // messeage display window
        // https://bugzilla.mozilla.org/show_bug.cgi?id=330458
        // aWindow.document.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null); // async load
        let targetObject = aWindow.MessageDisplayWidget;
        if ( typeof(aWindow.StandaloneMessageDisplayWidget) != 'undefined' ) targetObject = aWindow.StandaloneMessageDisplayWidget; // single window message display
        // for already opened msg window, but onLoadStarted may also called on the same message
        if ( typeof(aWindow.gFolderDisplay) != 'undefined' )ldapInfo.showPhoto(targetObject, aWindow.gFolderDisplay);
        ldapInfoLog.info('msg view hook for onLoadStarted');
        aWindow.hookedFunctions.push( ldapInfoaop.after( {target: targetObject, method: 'onLoadStarted'}, function(result) {
          ldapInfo.showPhoto(this);
          return result;
        })[0] );
        // This is for Thunderbird Conversations
        let TCObserver = {
          observe: function(subject, topic, data) {
            if ( topic == "Conversations" && data == 'Displayed') {
              ldapInfoLog.info("should show");
              ldapInfo.showPhoto(targetObject, aWindow.gFolderDisplay);
            }
          },
        };
        Services.obs.addObserver(TCObserver, "Conversations", false);
        aWindow.TCObserver = TCObserver;
        if ( typeof(aWindow.gMessageListeners) != 'undefined' ) { // this not work with multi mail view
          ldapInfo.modifyTooltip4HeaderRows(doc, true);
          ldapInfoLog.info('gMessageListeners register for onEndHeaders');
          let listener = {};
          listener.docref = docref;
          listener.onStartHeaders = listener.onEndAttachments = function() {};
          listener.onEndHeaders = function() {
            ldapInfoLog.info('onEndHeaders');
            let nowdoc = this.docref.get();
            if ( nowdoc && nowdoc.getElementById ) ldapInfo.modifyTooltip4HeaderRows(nowdoc, true);
          }
          aWindow.gMessageListeners.push(listener);
        }
      } else if ( typeof(aWindow.gPhotoDisplayHandlers) != 'undefined' && typeof(aWindow.displayPhoto) != 'undefined' ) { // address book
        ldapInfoLog.info('address book hook for displayPhoto');
        aWindow.hookedFunctions.push( ldapInfoaop.around( {target: aWindow, method: 'displayPhoto'}, function(invocation) {
          let [aCard, aImg] = invocation.arguments; // aImg.src now maybe the pic of previous contact
          let win = aImg.ownerDocument.defaultView.window;
          let results = invocation.proceed();
          if ( aCard.primaryEmail && win ) {
            ldapInfo.updateImgWithAddress(aImg, aCard.primaryEmail.toLowerCase(), win);
          }
          return results;
        })[0] );
      } else if ( typeof(aWindow.gPhotoHandlers) != 'undefined' ) { // address book edit dialog
        ldapInfoLog.info('address book dialog hook for onShow');
        aWindow.hookedFunctions.push( ldapInfoaop.around( {target: aWindow.gPhotoHandlers['generic'], method: 'onShow'}, function(invocation) {
          let [aCard, aDocument, aTargetID] = invocation.arguments; // aCard, document, "photo"
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
        //ComposeFieldsReady will call listbox.parentNode.replaceChild(newListBoxNode, listbox);
        aWindow.hookedFunctions.push( ldapInfoaop.after( {target: aWindow, method: 'ComposeFieldsReady'}, function(result) {
          ldapInfoLog.info('ComposeFieldsReady');
          let nowdoc = docref.get();
          if ( nowdoc && nowdoc.getElementById ) ldapInfo.initComposeListener(nowdoc);
          return result;
        })[0] );
        // Compose Window can be recycled, and if it's closed, shutdown can't find it's aWindow and no unLoad is called
        // So we call unLoad when it's closed but become hidden
        if ( typeof(aWindow.gComposeRecyclingListener) != 'undefined' ) {
          ldapInfoLog.info('gComposeRecyclingListener hook for onClose');
          aWindow.hookedFunctions.push( ldapInfoaop.after( {target: aWindow.gComposeRecyclingListener, method: 'onClose'}, function(result) {
            ldapInfoLog.info('compose window onClose');
            let newwin = winref.get();
            if ( newwin && newwin.document ) ldapInfo.unLoad(newwin);
            ldapInfoLog.info('compose window unLoad done');
            return result;
          })[0] );
        }
      }
      if ( aWindow.hookedFunctions.length ) {
        ldapInfoLog.info('create popup');
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
      ldapInfoLog.info('input listener');
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
      let doc = cell.ownerDocument;
      if ( col == 1 ) cell = doc.getElementById('addressCol2#' + row ); //cell.parentNode.nextSibling.firstChild not work with Display Thunderbird Contacts Addon
      if ( !cell || typeof(cell.value) == 'undefined' ) return;
      if ( cell.value == '' && row > 1 ) cell = doc.getElementById('addressCol2#' + (row -1));
      if ( cell.value == '' || cell.value.indexOf('@') < 0 ) return;
      
      let win = doc.defaultView;
      let imageID = boxID + 'compose';
      let image = doc.getElementById(imageID);
      if ( !image ) {
        let refId = 'attachments-box';
        let refEle = doc.getElementById(refId);
        if ( !refEle ){
          ldapInfoLog.info("can't find ref " + refId);
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
      }
      image.setAttribute('src', "chrome://messenger/skin/addressbook/icons/contact-generic.png");
      let email = GlodaUtils.parseMailAddresses(cell.value.toLowerCase()).addresses[0];
      ldapInfo.updateImgWithAddress(image, email, win);
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
  },
  
  onUnLoad: function(event) {
    ldapInfoLog.info('onUnLoad');
    let aWindow = event.currentTarget;
    if ( aWindow ) {
      ldapInfo.unLoad(aWindow);
    }
  },

  unLoad: function(aWindow) {
    try {
      ldapInfoLog.info('unload');
      if ( typeof(aWindow.hookedFunctions) != 'undefined' ) {
        ldapInfoLog.info('unhook');
        aWindow.removeEventListener("unload", ldapInfo.onUnLoad, false);
        aWindow.hookedFunctions.forEach( function(hooked) {
          hooked.unweave();
        } );
        delete aWindow.hookedFunctions;
        let doc = aWindow.document;
        if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' && typeof(aWindow.gMessageListeners) != 'undefined' ) {
          ldapInfoLog.info('gMessageListeners unregister');
          for( let i = aWindow.gMessageListeners.length - 1; i >= 0; i-- ) {
            let listener = aWindow.gMessageListeners[i];
            if ( listener.docref && listener.docref.get() === doc ) {
              ldapInfoLog.info('gMessageListeners unregistr index ' + i);
              aWindow.gMessageListeners.splice(i, 1);
              break;
            }
          }
        }
        if ( typeof(aWindow.TCObserver) != 'undefined' ) {
          Services.obs.removeObserver(aWindow.TCObserver, "Conversations", false);
          delete aWindow.TCObserver;
        }
        let input = doc.getElementById(composeWindowInputID);
        if ( input ) { // compose window
          ldapInfoLog.info('unload compose window listener');
          input.removeEventListener('focus', ldapInfo.composeWinUpdate, true);
          input.removeEventListener('input', ldapInfo.composeWinUpdate, true);
        }
        for ( let node of aWindow.ldapinfoCreatedElements ) {
          if ( typeof(node) == 'string' ) node = doc.getElementById(node);
          if ( node && node.parentNode ) {
            ldapInfoLog.info("removed node " + node);
            node.parentNode.removeChild(node);
          }
        }
        delete aWindow.ldapinfoCreatedElements;
        this.modifyTooltip4HeaderRows(doc, false); // remove
        let image = doc.getElementById(addressBookImageID);
        if ( !image ) image = doc.getElementById(addressBookDialogImageID);
        if ( image ) { // address book
          ldapInfoLog.info('unload addressbook image property');
          delete image.ldap;
          delete image.address;
          delete image.validImage;
          image.removeAttribute('tooltip');
        }
      }
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
    ldapInfoLog.info('unload done');
  },

  cleanup: function() {
    try {
      ldapInfoLog.info('ldapInfo cleanup');
      ldapInfoSprintf.sprintf.cache = null;
      ldapInfoSprintf.sprintf = null;
      this.clearCache();
      ldapInfoFetch.cleanup();
      ldapInfoLog.info('ldapInfo cleanup1');
      ldapInfoFetchOther.cleanup();
      ldapInfoLog.info('ldapInfo cleanup2');
      ldapInfoUtil.cleanup();
      ldapInfoFacebook.cleanup();
      Cu.unload("chrome://ldapInfo/content/aop.jsm");
      Cu.unload("chrome://ldapInfo/content/sprintf.jsm");
      Cu.unload("chrome://ldapInfo/content/ldapInfoFetch.jsm");
      Cu.unload("chrome://ldapInfo/content/ldapInfoFetchOther.jsm");
      Cu.unload("chrome://ldapInfo/content/ldapInfoFacebook.jsm");
      Cu.unload("chrome://ldapInfo/content/ldapInfoUtil.jsm");
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
    ldapInfoLog.info('ldapInfo cleanup done');
    Cu.unload("chrome://ldapInfo/content/log.jsm");
    ldapInfoLog = ldapInfoaop = ldapInfoFetch = ldapInfoFetchOther = ldapInfoUtil = ldapInfoSprintf = ldapInfoFacebook = null;
  },
  
  clearCache: function() {
    ldapInfoLog.info('clearCache');
    this.mail2jpeg = {}; // can't use this.mail2jpeg = this.mail2ldap = {}, will make 2 variables point the same place
    this.mail2ldap = {};
    delete this.ldapServers;
    ldapInfoFetch.clearCache();
  },
  
  updatePopupInfo:function(image, aWindow, headerRow) {
    try {
      ldapInfoLog.info('updatePopupInfo');
      if ( !aWindow || !aWindow.document ) return;
      let doc = aWindow.document;
      let tooltip = doc.getElementById(tooltipID);
      let rows = doc.getElementById(tooltipRowsID);
      if ( !rows || !tooltip || ['showing', 'open'].indexOf(tooltip.state) < 0 ) return;
      if ( tooltip.state == 'open' && typeof(tooltip.address) != 'undefined' && typeof(image) != 'undefined' && tooltip.address != image.address ) return;
      // remove old tooltip
      while (rows.firstChild) {
        rows.removeChild(rows.firstChild);
      }
      
      let ldap = {};
      if ( image != null && typeof(image) != 'undefined' ) {
        tooltip.address = image.address;
        if ( /*headerRow && */image.getAttribute('src') ) {
          ldap['_image'] = [image.getAttribute('src')]; // so it will be the first one to show
        }
        ldap['_email'] = [image.address];
        for ( let i in image.ldap ) { // shadow copy
          ldap[i] = image.ldap[i];
        }
      } else if ( headerRow ) {
        ldap = { '': [headerRow.tooltiptextSave || headerRow.getAttribute('fullAddress') || ""] };
      }
      for ( let p in ldap ) {
        let va = ldap[p];
        if ( va.length <= 0 ) continue;
        let v = va[0];
        if ( va.length == 1 && ( typeof(v) == 'undefined' || v == '' ) ) continue;
        if ( va.length > 1 ) v = va.sort().join(', ');
        if ( v && typeof(v.toString) == 'function' ) v = v.toString(); // in case v is number, it has no indexOf
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
          if ( v.length > lineLimit + 10 ) v = v.substr(0, lineLimit) + " [" + (v.length - lineLimit ) + " chars omitted...]"; // ~ 20 lines for 600px, 15 lines for 800px
          //col2.setAttribute('value', v);
          col2.textContent = v; // so it can wrap
          if ( v.indexOf("://") >= 0 ) {
            col2.classList.add("text-link");
            col2.addEventListener('mousedown', function(event){
              ldapInfoUtil.loadUseProtocol(event.target.textContent);
            }, true);
          } else if ( ['telephoneNumber', 'pager','mobile', 'facsimileTelephoneNumber', 'mobileTelephoneNumber', 'pagerTelephoneNumber'].indexOf(p) >= 0 ) {
            col2.classList.add("text-link");
            col2.addEventListener('mousedown', function(event){
              let url = ldapInfoSprintf.sprintf( ldapInfoUtil.options['click2dial'], event.target.textContent );
              ldapInfoUtil.loadUseProtocol(url);
            }, true);
          }
        }
        row.insertBefore(col1, null);
        row.insertBefore(col2, null);
        rows.insertBefore(row, null);
      }
    } catch(err) {  
      ldapInfoLog.logException(err);
    }
  },
  
  ldapCallback: function(callbackData) {
    try {
      ldapInfoLog.info('ldapCallback');
      let my_address = callbackData.address;
      let aImg = callbackData.image;
      if ( typeof(aImg.ldap) != 'undefined' ) delete aImg.ldap['_Status'];
      let succeed = false;
      
      if ( typeof(callbackData.ldap) != 'undefined' && typeof(callbackData.ldap['_dn']) != 'undefined' ) {
        ldapInfoLog.info('callback valids');
        succeed = true;
        if ( !callbackData.validImage && ldapInfoUtil.options.load_from_photo_url ) {
          try {
            callbackData.src = ldapInfoSprintf.sprintf( ldapInfoUtil.options['photoURL'], callbackData.ldap );
            callbackData.validImage = true;
          } catch ( err ) {
            ldapInfoLog.info('photoURL format error: ' + err);
          }
        }
        ldapInfo.mail2jpeg[my_address] = callbackData.src;
        ldapInfo.mail2ldap[my_address] = callbackData.ldap;
      } else { // fail to get info from ldap
        if ( callbackData.validImage ) { // addressbook has photo
          ldapInfo.mail2jpeg[my_address] = callbackData.src;
          ldapInfo.mail2ldap[my_address]['_Status'] = callbackData.ldap['_Status'];
          callbackData.ldap = ldapInfo.mail2ldap[my_address]; // value from addressbook
        }
        ldapInfoLog.info('callback failed');
      }
      if ( my_address == aImg.address ) {
        ldapInfoLog.info('same address for image');
        if ( succeed ) aImg.setAttribute('src', callbackData.src);
        aImg.ldap = callbackData.ldap;
        aImg.validImage = callbackData.validImage;
      } else {
        ldapInfoLog.info('different image');
      }
      ldapInfo.updatePopupInfo(aImg, callbackData.win.get(), null);
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },
  
  loadImageSucceed: function(event) {
    let aImg = event.target;
    if ( !aImg || !aImg.address ) return;
    let src = aImg.getAttribute('src');
    ldapInfoLog.info('loadImageSucceed :' + aImg.address + ":"+ src);
    aImg.removeEventListener('error', ldapInfo.loadImageFailed, false);
    aImg.removeEventListener('load', ldapInfo.loadImageSucceed, false);
    if ( !ldapInfo.mail2jpeg[aImg.address] && typeof(aImg.tryURLs) != 'undefined' && src.indexOf("chrome:") < 0 ) {
      ldapInfo.mail2jpeg[aImg.address] = src;
      ldapInfo.mail2ldap[aImg.address] = aImg.ldap;
      if ( typeof(ldapInfo.mail2ldap[aImg.address]['_Status']) == 'undefined' ) ldapInfo.mail2ldap[aImg.address]['_Status'] = [];
      ldapInfo.mail2ldap[aImg.address]['_Status'] = [ ldapInfo.mail2ldap[aImg.address]['_Status'] + ", Picture from Service " + aImg.trying ];
      //if ( aImg.trying == 'Google' ) ldapInfo.mail2ldap[aImg.address]['url'] = "";
    }
    delete aImg.trying;
    delete aImg.tryURLs;
  },
  
  loadImageFailed: function(event) {
    let aImg = event.target;
    if ( !aImg || !aImg.address ) return;
    ldapInfoLog.info('loadImageFailed :' + aImg.address + ":" + aImg.getAttribute('src'));
    aImg.setAttribute('badsrc', aImg.getAttribute('src'));
    let next;
    if ( aImg.tryURLs ){
      let info = aImg.tryURLs.shift();
      if ( info[0] != aImg.address || aImg.getAttribute('src').indexOf("chrome:") >= 0) { // not same image or image using internal src, give up
        ldapInfoLog.info('loadImageFailed & giveup :' + info[0]);
        aImg.removeEventListener('error', ldapInfo.loadImageFailed, false);
        aImg.removeEventListener('load', ldapInfo.loadImageSucceed, false);
        return;
      }
      next = info[1];
      aImg.trying = info[2];
    }
    if ( !next || typeof(next) == 'undefined' )
      next = "chrome://messenger/skin/addressbook/icons/remote-addrbook-error.png";
    aImg.setAttribute('src', next);
    aImg.validImage = false;
  },

  showPhoto: function(aMessageDisplayWidget, folder) {
    try {
      //aMessageDisplayWidget.folderDisplay.selectedMessages array of nsIMsgDBHdr, can be 1
      //                                   .selectedMessageUris array of uri
      //                     .displayedMessage null if mutil, nsImsgDBHdr =>mime2DecodedAuthor,mime2DecodedRecipients [string]
      ldapInfoLog.info("showPhoto");
      if ( !aMessageDisplayWidget ) return;
      let folderDisplay = ( typeof(folder)!='undefined' ) ? folder : aMessageDisplayWidget.folderDisplay;
      if ( !folderDisplay || !folderDisplay.msgWindow ) return;
      let win = folderDisplay.msgWindow.domWindow;
      if ( !win ) return;
      ldapInfoFacebook.get_access_token();
      let addressList = [];
      //let isSingle = aMessageDisplayWidget.singleMessageDisplay; // only works if loadComplete
      let isSingle = (folderDisplay.selectedCount <= 1);
      // check if Thunderbird Conversations Single Mode, which is also multiview
      let isTC = false;
      let TCSelectedHdr = null;
      if ( typeof(win.Conversations) != 'undefined' && win.Conversations.currentConversation ) {
        isTC = true;
        isSingle = false;
        // win.Conversations.currentConversation.msgHdrs && win.Conversations.currentConversation.messages are what we looking for
        win.Conversations.currentConversation.messages.some( function(message) {
          if ( message.message._selected ) {
            TCSelectedHdr = message.message._msgHdr;
            return true;
          }
        } );
      }
      let targetMessages = isTC ? win.Conversations.currentConversation.msgHdrs : folderDisplay.selectedMessages;

      let imageLimit = isSingle ? 36 : 12;
      for ( let selectMessage of targetMessages ) {
        let who = [];
        let headers = ['author'];
        if ( targetMessages.length <= 1 || ( isTC && TCSelectedHdr === selectMessage ) ) headers = ['author', 'replyTo', 'recipients', 'ccList', 'bccList'];
        headers.forEach( function(header) {
          let headerValue;
          if ( header == 'replyTo' ) { // sometimes work, sometimes not
            headerValue = selectMessage.getStringProperty(header);
          } else {
            headerValue = selectMessage[header];
          }
          if ( typeof(headerValue) != 'undefined' && headerValue != null && headerValue != '' ) who.push( GlodaUtils.deMime(headerValue) );
        } );
        for ( let address of GlodaUtils.parseMailAddresses(who.join(',').toLowerCase()).addresses ) {
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
        ldapInfoLog.info("can't find ref " + refId);
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
        ldapInfoLog.info('show image for ' + address);
        // use XUL image element for chrome://generic.png
        // image within html doc won't ask password
        let image = doc.createElementNS(XULNS, "image");
        let innerbox = doc.createElementNS(XULNS, isSingle ? "vbox" : "hbox"); // prevent from image resize
        innerbox.insertBefore(image, null);
        box.insertBefore(innerbox, null);
        image.id = boxID + address; // for header row to find me
        image.maxHeight = addressList.length <= 8 ? 64 : 48;
        image.setAttribute('src', "chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png");
        ldapInfo.updateImgWithAddress(image, address, win);
      } // all addresses
      
      if ( isTC ) { // for TB Conversations Contacts
        let browser = doc.getElementById('multimessage');
        if ( !browser || !browser._docShell ) return;
        let htmldoc = browser._docShell.QueryInterface(Ci.nsIDocShell).contentViewer.DOMDocument;
        if ( !htmldoc ) return;
        let messageList = htmldoc.getElementById('messageList');
        if ( !messageList ) return;
        let letImageDivs = messageList.getElementsByClassName('authorPicture');
        Array.forEach(letImageDivs, function(imageDiv) {
          for ( let imageNode of imageDiv.childNodes ) {
            if ( imageNode.nodeName == 'img' && typeof(imageNode.changedImage) == 'undefined' ) { // finally got it
              imageNode.changedImage = true;
              let src = imageNode.getAttribute('src');
              if ( src && src.indexOf("chrome:") == 0 ) {
                let authorEmail = imageDiv.previousElementSibling.getElementsByClassName('authorEmail');
                if ( typeof(authorEmail) == 'undefined' ) continue;
                authorEmail = authorEmail[0].textContent.trim().toLowerCase();
                ldapInfoLog.info('Find TB Conversations Contacts: ' + authorEmail);
                ldapInfo.updateImgWithAddress(imageNode, authorEmail, win);
              }
            }
          }
        } );
      }
      
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
  
  updateImgWithAddress: function(image, address, win) {
    // For address book, it reuse the same iamge, so can't use image as data container because user may quickly change the selected card
    let callbackData = { image: image, address: address, win: Cu.getWeakReference(win), validImage: false, ldap: {}, callback: ldapInfo.ldapCallback, retryTimes: 0 };
    image.address = address; // used in callback verification, still the same address?
    image.tooltip = tooltipID;
    image.ldap = {};
    image.addEventListener('error', ldapInfo.loadImageFailed, false); // duplicate listener will be discard
    image.addEventListener('load', ldapInfo.loadImageSucceed, false);
    ldapInfo.updatePopupInfo(image, win, null); // clear tooltip info if user trigger it now

    let imagesrc = ldapInfo.mail2jpeg[address];
    if ( typeof(imagesrc) != 'undefined' ) {
      image.setAttribute('src', imagesrc);
      ldapInfoLog.info('use cached info ' + image.getAttribute('src').substr(0,100));
      image.ldap = ldapInfo.mail2ldap[address];
      if ( typeof(image.ldap['_Status']) != 'undefined' && image.ldap['_Status'].length == 1 ) image.ldap['_Status'] = ['Cached', image.ldap['_Status']];
      ldapInfo.updatePopupInfo(image, win, null);
      return;
    }
    if ( [addressBookImageID, addressBookDialogImageID].indexOf(image.id) >= 0 ) {
      if ( typeof(win.defaultPhotoURI) != 'undefined' && image.getAttribute('src') != win.defaultPhotoURI ) { // has photo, but not saving to mail2jpeg cache
        callbackData.validImage = true;
        ldapInfo.mail2ldap[address] = {_Status: ["Picture from Address book"]};
      }
    } else if ( ldapInfo.getPhotoFromABorLocalDir(address, callbackData) ) {
      ldapInfoLog.info("use local or address book photo " + image.getAttribute('src'));
      callbackData.validImage = true;
      //ldapInfo.mail2jpeg[address] = image.src; // update in callback
      ldapInfo.mail2ldap[address] = callbackData.ldap; // maybe override by ldap
      ldapInfo.updatePopupInfo(image, win, null);
      callbackData.ldap = {};
    }
    
    if ( typeof( ldapInfo.ldapServers ) == 'undefined' ) ldapInfo.getLDAPFromAB();
    let match = address.match(/(\S+)@(\S+)/);
    if ( match && match.length == 3 ) {
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
          callbackData.mailid = mailid;
          callbackData.mailDomain = mailDomain;
          //ldapInfo.tryFacebook(callbackData);
          ldapInfo.UpdateWithURLs(callbackData);
          ldapInfo.updatePopupInfo(image, win, null);
        }
        return;
      }
      image.ldap['_Status'] = ["Querying... please wait"];
      let filter; // filter: (|(mail=*spe*)(cn=*spe*)(givenName=*spe*)(sn=*spe*))
      try {
        let parameter = {email: address, uid: mailid, domain: mailDomain};
        filter = ldapInfoSprintf.sprintf( ldapInfoUtil.options.filterTemplate, parameter );
      } catch (err) {
        ldapInfoLog.log("filterTemplate is not correct: " + ldapInfoUtil.options.filterTemplate, "Exception");
        return;
      }
      callbackData.src = image.getAttribute('src');
      for ( let i in image.ldap ) { // shadow copy
        if( i != '_Status' ) callbackData.ldap[i] = image.ldap[i];
      }
      ldapInfoFetch.queueFetchLDAPInfo(callbackData, ldapServer.host, ldapServer.prePath, ldapServer.baseDn, ldapServer.authDn, filter, ldapInfoUtil.options.ldap_attributes);
    } // try ldap
  },
  
  tryFacebook: function(callbackData) {
    try {
      if ( !ldapInfoFacebook.access_token ) return;
      let oReq = new XMLHttpRequest();
      oReq.open("GET", "http://www.facebook.com/search.php?type=user&q=" + callbackData.address + '&access_token=' + ldapInfoFacebook.access_token, true);
      //oReq.open("GET", "http://www.google.com", true);
      oReq.timeout = 10000;
      oReq.onload = function (oEvent) {
        //let blob = new Blob([oReq.response], {type: "image/png"});
        ldapInfoLog.logObject(oReq, 'load', 0);
        ldapInfoLog.logObject(oReq.response, 'oReq.response', 0);
        let win = callbackData.win.get();
        if ( win && win.document ) {
          let blob = new Blob([oReq.response], {type: "document"});
          ldapInfoLog.logObject(blob, 'blob', 0);
        }
      };
      oReq.onloadstart = function() {
        ldapInfoLog.logObject(oReq, 'start', 0);
      };
      oReq.onloadend = function() {
        ldapInfoLog.logObject(oReq, 'loadend', 0);
      };
      oReq.send();
    } catch(err) {  
        ldapInfoLog.logException(err);
    }
  },
  
  UpdateWithURLs: function(callbackData) {
    ldapInfoFetchOther.queueFetchOtherInfo(callbackData);
    return;
    let image = callbackData.image;
    image.tryURLs = [];
    if ( 1 && ["gmail.com", "googlemail.com"].indexOf(callbackData.mailDomain)>= 0 ) {
      let mailID = callbackData.mailid.replace(/\+.*/, '');
      image.tryURLs.push([callbackData.address, "http://profiles.google.com/s2/photos/profile/" + mailID, "Google"]);
      //image.tryURLs.push([callbackData.address, "https://plus.google.com/s2/photos/profile/" + mailID, "Google+"]);
    }
    if ( ldapInfoUtil.options.load_from_gravatar ) {
      let hash = GlodaUtils.md5HashString( callbackData.address );
      image.tryURLs.push([callbackData.address, 'http://www.gravatar.com/avatar/' + hash + '?d=404', "Gravatar"]);
    }
    image.tryURLs.push([callbackData.address, image.getAttribute('src'), "Default"]); // fallback to current src
    ldapInfoLog.logObject(image.tryURLs, 'image.tryURLs', 1);
    let first = image.tryURLs.shift();
    image.trying = first[2];
    image.setAttribute('src', first[1]);
  },

};
