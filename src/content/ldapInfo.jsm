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
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/aop.jsm");
Cu.import("chrome://ldapInfo/content/sprintf.jsm");

const boxID = 'displayLDAPPhoto';
const tooltipID = 'ldapinfo-tooltip';
const tooltipGridID = "ldapinfo-tooltip-grid";
const tooltipRowsID = "ldapinfo-tooltip-rows";
const popupsetID = 'ldapinfo-popupset';
const statusbarIconID = 'ldapinfo-statusbar-icon';
const contextMenuID = 'ldapinfo-statusbar-context';
const statusbarTooltipID = 'ldapinfo-statusbar-tooltip';
const addressBookImageID = 'cvPhoto';
const addressBookDialogImageID = 'photo';
const composeWindowInputID = 'addressingWidget';
const msgHeaderViewDeck = 'msgHeaderViewDeck';
const msgHeaderView = 'msgHeaderView';
const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const lineLimit = 2048;
const servicePriority = {local_dir: 500, addressbook: 200, ldap: 100, facebook: 60, linkedin: 50, flickr: 40, google: 30, gravatar: 20, domain_wildcard: 10};
const allServices = Object.keys(servicePriority).sort( function(a,b) { return servicePriority[b] - servicePriority[a]; } );

let ldapInfo = {
  // local only provide image, ab provide image & info, but info is used only when ldap not available, other remote provide addtional image or Name/url etc.
  // callback update image src and popup, popup is calculate on the fly, image only have original email address and validImage (default 0).
  // image src will be update if old is not valid or newer has higher priority: local > ab > ldap > social networks > domain_wildcard, see servicePriority
  // local dir are positive cache only, others are both positive & negative cache
  // if has src, then it must be valid
  // state: 0 => init / need retry for ldap, 1=> working, 2 => finished, 4 => error, 8 => temp error
  cache: {}, // { foo@bar.com: { local_dir: {src:file://...}, addressbook: {}, ldap: {state: 2, list1: [], list2: [], src:..., validImage:100}, facebook: {state: 2, src:data:..., facebook: [http://...]}, google: {}, gravatar:{} }
  //mailList: [], // [[foo@bar.com, foo@a.com, foo2@b.com], [...]]
  //mailMap: {}, // {foo@bar.com: 0, foo@a.com:0, ...}
  timer: null,
  composeWinTimer: null,
  strBundle: Services.strings.createBundle('chrome://ldapInfo/locale/ldapinfoshow.properties'),
  getLDAPFromAB: function() {
    try {
      ldapInfoLog.info('Get LDAP server from addressbook');
      this.ldapServers = {};
      let allAddressBooks = MailServices.ab.directories;
      let found = false;
      while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext().QueryInterface(Ci.nsIAbDirectory);
        if ( addressBook instanceof Ci.nsIAbLDAPDirectory && addressBook.isRemote && addressBook.lDAPURL ) {
          /* addressBook:
             URI (string) 'moz-abldapdirectory://ldap_2.servers.OriginalName'
             uuid (string) 'ldap_2.servers.OriginalName&CurrentName'
             lDAPURL:
             spec (string) 'ldap://directory.company.com/o=company.com??sub?(objectclass=*)'
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
          if ( !addressBook.uuid || !ldapURL.prePath || !ldapURL.spec || !ldapURL.dn ) continue;
          found = true;
          this.ldapServers[addressBook.uuid] = { baseDn:ldapURL.dn, spec:ldapURL.spec, prePath:ldapURL.prePath, host:ldapURL.host, scope:ldapURL.scope,
                                                 attributes:ldapURL.attributes, authDn:addressBook.authDn, dirName:addressBook.dirName.toLowerCase() }; // authDn is binddn
        }
      }
      // if ( Object.getOwnPropertyNames( this.ldapServers ).length === 0 ) {
      if ( !found ) ldapInfoLog.log(this.strBundle.GetStringFromName("prompt.noldap"), 'Error');
      ldapInfoLog.logObject(this.ldapServers, 'ldapServers', 1);
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },
  
  abListener: {
    onItemAdded: function (aParentDir, aItem) { this.checkItem(aItem); },
    onItemPropertyChanged: function (aItem, aProperty, aOldValue, aNewValue) { this.checkItem(aItem); },
    onItemRemoved: function (aParentDir, aItem) { this.checkItem(aItem); },
    checkItem: function(aItem) {
      if ( aItem instanceof Ci.nsIAbCard ) { // instanceof will QueryInterface
        if ( aItem.isMailList ) {
          ldapInfo.clearCache('addressbook'); // easy way
        } else {
          ldapInfoLog.info('addressbook item change');
          for ( let email of [aItem.primaryEmail, aItem.secondEmail] ) {
            if ( !email ) continue;
            let mail = email.toLowerCase();
            if ( typeof(ldapInfo.cache[mail]) == 'undefined'  ) continue;
            ldapInfoLog.info('clean addressbook cache for ' + mail);
            ldapInfo.cache[mail].addressbook = {state: ldapInfoUtil.STATE_INIT};
          }
        }
      } else if ( aItem instanceof Ci.nsIAbDirectory ) {
        ldapInfoLog.info('clean ldapServers because one addressbook changed');
        delete ldapInfo.ldapServers;
      }
    },
    Added: false,
    add: function() {
      if ( !this.Added ) MailServices.ab.addAddressBookListener(ldapInfo.abListener, Ci.nsIAbListener.all);
      this.Added = true;
    },
    remove: function() { MailServices.ab.removeAddressBookListener(ldapInfo.abListener); this.Added = false; },
  },
  
  updateTooltip: function(doc) {
    let tooltip = doc.getElementById(statusbarTooltipID);
    if ( !tooltip ) return false;
    while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
    let line1 = doc.createElementNS(XULNS, "label");
    line1.setAttribute('value', ldapInfoUtil.Name + " " + ldapInfoUtil.Version);
    let line2 = doc.createElementNS(XULNS, "label");
    line2.setAttribute('value', "Total " + Object.keys(ldapInfo.cache).length + " items cached, roughly use " + ldapInfoUtil.friendlyNumber(ldapInfoUtil.roughSizeOfObject(ldapInfo.cache), 2)+ " memory");
    let grid = doc.createElementNS(XULNS, "grid");
    let columns = doc.createElementNS(XULNS, "columns");
    for ( let i = 1; i <= 4; i++ ) {
      let column = doc.createElementNS(XULNS, "column");
      columns.insertBefore(column, null);
    }
    let rows = doc.createElementNS(XULNS, "rows");
    let row = doc.createElementNS(XULNS, "row");
    ["Services", "Enabled", "Has Avatar", "No Avatar", "Not Found"].forEach( function(value) {
      let column = doc.createElementNS(XULNS, "label");
      column.setAttribute('value', value);
      row.insertBefore(column, null);
    } );
    rows.insertBefore(row, null);
    let info = {}; // { LDAP: [80, 10, 2], ... }
    allServices.forEach( function(place) {
      info[place] = [place, ldapInfoUtil.CHAR_NOUSER, 0, 0, 0]; // "Services", "Enable", "Has Avatar", "No Avatar", "Not Found"
      if ( ldapInfoUtil.options['load_from_' + place] ) info[place][1] = ldapInfoUtil.CHAR_HAVEPIC;
    });
    for ( let address in ldapInfo.cache ) {
      let cache = ldapInfo.cache[address];
      allServices.forEach( function(place) {
        if ( cache[place] && cache[place].state == ldapInfoUtil.STATE_DONE ) {
          if ( cache[place].src ) info[place][2] ++;
          else if ( cache[place]._Status && cache[place]._Status[0] && cache[place]._Status[0].endsWith(ldapInfoUtil.CHAR_NOPIC) ) info[place][3] ++;
          else info[place][4] ++;
        }
      } );
    }
    allServices.forEach( function(place) {
      let row = doc.createElementNS(XULNS, "row");
      info[place].forEach( function(value) {
        let column = doc.createElementNS(XULNS, "label");
        column.setAttribute('value', value);
        row.insertBefore(column, null);
      } );
      rows.insertBefore(row, null);
    });
    grid.insertBefore(rows, null);
    tooltip.insertBefore(line1, null);
    tooltip.insertBefore(line2, null);
    tooltip.insertBefore(grid, null);
    return true;
  },

  PopupShowing: function(event) {
    try {
      let doc = event.view.document;
      let triggerNode = event.target.triggerNode;
      if ( triggerNode.id == statusbarIconID ) return ldapInfo.updateTooltip(doc);
      let targetNode = triggerNode;
      let headerRow = false;
      if ( triggerNode.nodeName == 'mail-emailaddress' ){
        headerRow = true;
        let emailAddress = triggerNode.getAttribute('emailAddress').toLowerCase();
        let targetID = boxID + emailAddress;
        targetNode = doc.getElementById(targetID);
      }
      ldapInfo.updatePopupInfo(targetNode, triggerNode.ownerDocument.defaultView.window, event, headerRow ? triggerNode : null);
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
      <menupopup id="">
        <menuitem lable=.../>
      </menupopup>
      <tooltip id="">
        Awesome ldapInfoShow 1.0
        Total 1000 items cached, roughly use 10M memory
            Services   Enabled  Avatar  No Avatar  Not Found
            LDAP       Yes      800     100        100
            ...
      </tooltip>
    </popupset>
    </overlay>
    */
    let doc = aWindow.document;
    let popupset = doc.createElementNS(XULNS, "popupset");
    popupset.id = popupsetID;
    let panel = doc.createElementNS(XULNS, "panel");
    panel.id = tooltipID;
    panel.position = 'start_before';
    panel.setAttribute('noautohide', true); // and enable titlebar
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
    let menupopup = doc.createElementNS(XULNS, "menupopup");
    menupopup.id = contextMenuID;
    [ ["Option", "chrome://messenger/skin/accountcentral/account-settings.png", function() { aWindow.openDialog("chrome://ldapInfo/content/ldapInfoPrefDialog.xul", "Opt", "chrome,dialog,modal"); }],
      ["Addon Homepage", "chrome://mozapps/skin/extensions/category-extensions.png", function(){ ldapInfoUtil.loadUseProtocol("https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/"); }],
      ["Help", "chrome://global/skin/icons/question-64.png", function(){ ldapInfoUtil.loadUseProtocol("http://code.google.com/p/ldapinfo/wiki/Help"); }],
      ["Report Bug", "chrome://global/skin/icons/warning-64.png", function(){ ldapInfoUtil.loadUseProtocol("http://code.google.com/p/ldapinfo/issues/list"); }],
      ["Donate", "chrome://ldapInfo/skin/donate.png", function(){ ldapInfoUtil.loadUseProtocol("https://addons.mozilla.org/en-US/thunderbird/addon/ldapinfoshow/developers"); }],
    ].forEach( function(menu) {
      let item = doc.createElementNS(XULNS, "menuitem");
      item.setAttribute('label', menu[0]);
      item.setAttribute('image', menu[1]);
      item.addEventListener('command', menu[2], false);
      item.setAttribute('class', "menuitem-iconic");
      menupopup.insertBefore(item, null);
    } );
    popupset.insertBefore(menupopup, null);
    let tooltip = doc.createElementNS(XULNS, "tooltip");
    tooltip.id = statusbarTooltipID;
    popupset.insertBefore(tooltip, null);
    doc.documentElement.insertBefore(popupset, null);
    panel.addEventListener("popupshowing", ldapInfo.PopupShowing, true);
    tooltip.addEventListener("popupshowing", ldapInfo.PopupShowing, true);
    aWindow._ldapinfoshow.createdElements.push(popupsetID);
  },
  
  disableForMessage: function(msgHdr) {
    return ( msgHdr.folder && msgHdr.folder.server && ldapInfoUtil.options.disable_server_lists[msgHdr.folder.server.key] );
  },

  modifyTooltip4HeaderRows: function(win, load) {
    try  {
      if ( win.gMessageDisplay && win.gMessageDisplay.displayedMessage && this.disableForMessage(win.gMessageDisplay.displayedMessage) ) load = false;
      ldapInfoLog.info('modifyTooltip4HeaderRows ' + load);
      // msgHeaderViewDeck expandedHeadersBox ... [mail-multi-emailHeaderField] > longEmailAddresses > emailAddresses > [mail-emailaddress]
      let deck = win.document.getElementById( ldapInfoUtil.isSeaMonkey ? msgHeaderView : msgHeaderViewDeck); // using deck for TB so compact headers also work
      if ( !deck ) return;
      let nodeLists = deck.getElementsByTagName('mail-multi-emailHeaderField'); // Can't get anonymous elements directly
      for ( let node of nodeLists ) {
        if ( node.ownerDocument instanceof Ci.nsIDOMDocumentXBL ) {
          let XBLDoc = node.ownerDocument;
          let emailAddresses = XBLDoc.getAnonymousElementByAttribute(node, 'anonid', 'emailAddresses');
          for ( let mailNode of emailAddresses.childNodes ) {
            if ( mailNode.nodeType == mailNode.ELEMENT_NODE && mailNode.className != 'emailSeparator' ) { // maybe hidden
              if ( load ) { // load
                if ( !mailNode._ldapinfoshowHFs ) {
                  mailNode.tooltip = tooltipID;
                  mailNode.tooltiptextSave = mailNode.tooltipText;
                  mailNode.removeAttribute("tooltiptext");
                  mailNode._ldapinfoshowHFs = [];
                  mailNode._ldapinfoshowHFs.push( ldapInfoaop.around( {target: mailNode, method: 'setAttribute'}, function(invocation) {
                    if ( invocation.arguments[0] == 'tooltiptext' ) { // block it
                      this.tooltiptextSave = invocation.arguments[1];
                      return true;
                    }
                    return invocation.proceed(); 
                  })[0] );
                  mailNode._ldapinfoshowHFs.push( ldapInfoaop.around( {target: mailNode, method: 'removeAttribute'}, function(invocation) {
                    if ( invocation.arguments[0] == 'tooltiptext' ) { // block it
                      delete this.tooltiptextSave;
                      return true;
                    }
                    return invocation.proceed(); 
                  })[0] );
                }
              } else { // unload
                if ( mailNode._ldapinfoshowHFs ) {
                  mailNode._ldapinfoshowHFs.forEach( function(hooked) {
                    hooked.unweave();
                  } );
                  delete mailNode._ldapinfoshowHFs;
                  if ( typeof(mailNode.tooltiptextSave) != 'undefined' ) mailNode.setAttribute('tooltiptext', mailNode.tooltiptextSave);
                  delete mailNode.tooltiptextSave;
                  delete mailNode.tooltip; mailNode.removeAttribute('tooltip');
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

  getPhotoFromLocalDir: function(mail, mailDomain, callbackData) {
    let localDir = ldapInfoUtil.options['local_pic_dir'];
    let have = false;
    if ( localDir != '' ) {
      let suffixes = ['png', 'gif', 'jpg', 'ico'];
      ['local_dir', 'domain_wildcard'].forEach( function(place) {
        if ( ldapInfoUtil.options['load_from_' + place] ) {
          have |= suffixes.some( function(suffix) {
            let file = new FileUtils.File(localDir);
            file.appendRelativePath( (  ( place == 'local_dir' ) ? mail : '@' + mailDomain )  + '.' + suffix );
            if ( file.exists() ) { // use the one under profiles/Photos
              callbackData.cache[place].src = Services.io.newFileURI(file).spec;
              return true;
            }
          } );
          // we provide only positive cache, and the state will be reset to INIT in updateImgWithAddress if not found, so user can add image any time
          callbackData.cache[place].state = ldapInfoUtil.STATE_DONE;
          callbackData.cache[place]._Status = [ ( ( place == 'local_dir' ) ? 'Local dir ' : 'Domain wildcard' ) + ( callbackData.cache[place].src ? ldapInfoUtil.CHAR_HAVEPIC : ldapInfoUtil.CHAR_NOUSER )];
        }
      } );
    }
    return have;
  },

  getPhotoFromAB: function(mail, callbackData) {
    let found = false, foundCard = false, card = null, currentData = callbackData.cache.addressbook;
    try {
      let allAddressBooks = MailServices.ab.directories;
      while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext().QueryInterface(Ci.nsIAbDirectory);
        if ( addressBook instanceof Ci.nsIAbDirectory && !addressBook.isRemote ) {
          try {
            card = addressBook.cardForEmailAddress(mail); // case-insensitive && sync, only retrun 1st one if multiple match, but it search on all email addresses
          } catch (err) {}
          if ( card ) {
            foundCard = true;
            let PhotoType = card.getProperty('PhotoType', "");
            if ( ['file', 'web'].indexOf(PhotoType) >= 0 ) {
              let PhotoURI = card.getProperty('PhotoURI', ""); // file://... or http://...
              let PhotoName = card.getProperty('PhotoName', ""); // filename under profiles/Photos/...
              if ( PhotoName ) {
                let file = FileUtils.getFile("ProfD", ['Photos', PhotoName]);
                if ( file.exists() ) { // use the one under profiles/Photos
                  found = true;
                  currentData.src = Services.io.newFileURI(file).spec;
                }
              } else if ( PhotoURI ) {
                found = true;
                currentData.src = PhotoURI;
              }
            }
            let pe = card.properties;
            while ( pe.hasMoreElements()) {
              let property = pe.getNext().QueryInterface(Ci.nsIProperty);
              if ( ["PhotoURI", "AllowRemoteContent", "RecordKey", "DbRowID", "PopularityIndex", "PhotoType", "LowercasePrimaryEmail", "GmContactEtag", "GmBookUri", "GmPhotoEtag"].indexOf(property.name) >= 0 ) continue;
              currentData[property.name] = [property.value];
            }
          }
        }
        if ( found ) break;
      }
    } catch (err) {
      ldapInfoLog.logException(err);
    }
    currentData.state = ldapInfoUtil.STATE_DONE;
    currentData._Status = ['Addressbook ' + ( found ? ldapInfoUtil.CHAR_HAVEPIC : ( foundCard ? ldapInfoUtil.CHAR_NOPIC : ldapInfoUtil.CHAR_NOUSER ) )];
    return found;
  },
  
  Load: function(aWindow) {
    if ( !ldapInfoUtil.isSeaMonkey ) return ldapInfo.realLoad(aWindow);
    if ( typeof(aWindow.gThreadPaneCommandUpdater) != 'undefined' && !aWindow.gThreadPaneCommandUpdater ) { // message display window not ready yet
      ldapInfoLog.info("window not ready yet, wait...");
      if ( !this.timer ) this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      this.timer.initWithCallback( function() { // can be function, or nsITimerCallback
        ldapInfo.Load(aWindow);
      }, 500, Ci.nsITimer.TYPE_ONE_SHOT );
    } else {
      ldapInfo.realLoad(aWindow);
    }
    return;
  },

  realLoad: function(aWindow) {
    try {
      ldapInfoLog.info("Load for " + aWindow.location.href);
      this.abListener.add();
      let doc = aWindow.document;
      let winref = Cu.getWeakReference(aWindow);
      let docref = Cu.getWeakReference(doc);
      if ( typeof(aWindow._ldapinfoshow) != 'undefined' ) ldapInfoLog.info("Already loaded, return");
      aWindow._ldapinfoshow = { createdElements:[], hookedFunctions:[], TCObserver: null };
      if ( typeof(aWindow.MessageDisplayWidget) != 'undefined' || aWindow.gThreadPaneCommandUpdater ) { // messeage display window
        // https://bugzilla.mozilla.org/show_bug.cgi?id=330458
        // aWindow.document.loadOverlay("chrome://ldapInfo/content/ldapInfo.xul", null); // async load
        let targetObject = aWindow.MessageDisplayWidget;
        let targetMethod = "onLoadStarted";
        if ( typeof(aWindow.StandaloneMessageDisplayWidget) != 'undefined' ) targetObject = aWindow.StandaloneMessageDisplayWidget; // single window message display
        if ( !targetObject && typeof(aWindow.gThreadPaneCommandUpdater) != 'undefined' && aWindow.gThreadPaneCommandUpdater ) { // SeaMonkey
          targetObject = aWindow.gThreadPaneCommandUpdater;
          targetMethod = "displayMessageChanged";
        };
        // for already opened msg window, but onLoadStarted may also called on the same message
        if ( typeof(aWindow.gFolderDisplay) != 'undefined' )ldapInfo.showPhoto(targetObject, aWindow.gFolderDisplay, winref);
        ldapInfoLog.info('msg view hook for ' + targetObject + "." + targetMethod);
        aWindow._ldapinfoshow.hookedFunctions.push( ldapInfoaop.after( {target: targetObject, method: targetMethod}, function(result) {
          ldapInfo.showPhoto(this, null, winref);
          return result;
        })[0] );
        // This is for Thunderbird Conversations
        let TCObserver = {
          observe: function(subject, topic, data) {
            if ( topic == "Conversations" && data == 'Displayed') {
              ldapInfo.showPhoto(targetObject, aWindow.gFolderDisplay, winref);
            }
          },
        };
        Services.obs.addObserver(TCObserver, "Conversations", false);
        aWindow._ldapinfoshow.TCObserver = TCObserver;
        if ( typeof(aWindow.gMessageListeners) != 'undefined' ) { // this not work with multi mail view
          ldapInfo.modifyTooltip4HeaderRows(aWindow, true);
          ldapInfoLog.info('gMessageListeners register for onEndHeaders');
          let listener = {};
          listener.winref = winref;
          listener.onStartHeaders = listener.onEndAttachments = function() {};
          listener.onEndHeaders = function() {
            ldapInfoLog.info('onEndHeaders');
            let newwin = winref.get();
            if ( newwin && newwin.document ) {
              newwin.setTimeout( function() { // use timer as compact header also use listener
                ldapInfo.modifyTooltip4HeaderRows(newwin, true);
              }, 0 );
            }
          }
          aWindow.gMessageListeners.push(listener);
        }
        let status_bar = doc.getElementById('status-bar');
        if ( status_bar ) { // add status bar icon
          let statusbarIcon = doc.createElementNS(XULNS, "statusbarpanel");
          statusbarIcon.id = statusbarIconID;
          statusbarIcon.setAttribute('class', 'statusbarpanel-iconic');
          statusbarIcon.setAttribute('src', 'chrome://ldapInfo/skin/icon.png');
          statusbarIcon.setAttribute('tooltip', statusbarTooltipID);
          statusbarIcon.setAttribute('popup', contextMenuID);
          statusbarIcon.setAttribute('context', contextMenuID);
          status_bar.insertBefore(statusbarIcon, null);
          aWindow._ldapinfoshow.createdElements.push(statusbarIconID);
        }
      } else if ( typeof(aWindow.gPhotoDisplayHandlers) != 'undefined' && typeof(aWindow.displayPhoto) != 'undefined' ) { // address book
        ldapInfoLog.info('address book hook for displayPhoto');
        aWindow._ldapinfoshow.hookedFunctions.push( ldapInfoaop.around( {target: aWindow, method: 'displayPhoto'}, function(invocation) {
          let [aCard, aImg] = invocation.arguments; // aImg.src now maybe the pic of previous contact
          let win = aImg.ownerDocument.defaultView.window;
          let results = invocation.proceed();
          if ( win ) { // if no primaryEmail, will be '' and clear tooltip
            ldapInfo.updateImgWithAddress(aImg, aCard.primaryEmail.toLowerCase(), win, aCard);
          }
          return results;
        })[0] );
      } else if ( typeof(aWindow.gPhotoHandlers) != 'undefined' ) { // address book edit dialog
        ldapInfoLog.info('address book dialog hook for onShow');
        aWindow._ldapinfoshow.hookedFunctions.push( ldapInfoaop.around( {target: aWindow.gPhotoHandlers['generic'], method: 'onShow'}, function(invocation) {
          let [aCard, aDocument, aTargetID] = invocation.arguments; // aCard, document, "photo"
          let aImg = aDocument.getElementById(aTargetID);
          let win = aDocument.defaultView.window;
          let type = aDocument.getElementById("PhotoType").value;
          let results = invocation.proceed();
          let address = aCard.primaryEmail.toLowerCase();
          if ( ldapInfo.cache[address] ) ldapInfo.cache[address].addressbook = {state: ldapInfoUtil.STATE_INIT}; // invalidate cache
          if ( ( type == 'generic' || type == "" ) && win ) ldapInfo.updateImgWithAddress(aImg, address, win, aCard);
          return results;
        })[0] );
      } else if ( typeof(aWindow.ComposeFieldsReady) != 'undefined' ) { // compose window
        ldapInfo.initComposeListener(doc, true);
        //ComposeFieldsReady will call listbox.parentNode.replaceChild(newListBoxNode, listbox);
        aWindow._ldapinfoshow.hookedFunctions.push( ldapInfoaop.after( {target: aWindow, method: 'ComposeFieldsReady'}, function(result) {
          ldapInfoLog.info('ComposeFieldsReady');
          let nowdoc = docref.get();
          if ( nowdoc && nowdoc.getElementById ) ldapInfo.initComposeListener(nowdoc, true);
          return result;
        })[0] );
        // Compose Window can be recycled, and if it's closed, shutdown can't find it's aWindow and no unLoad is called
        // So we call unLoad when it's closed but become hidden
        if ( typeof(aWindow.gComposeRecyclingListener) != 'undefined' ) {
          ldapInfoLog.info('gComposeRecyclingListener hook for onClose');
          aWindow._ldapinfoshow.hookedFunctions.push( ldapInfoaop.after( {target: aWindow.gComposeRecyclingListener, method: 'onClose'}, function(result) {
            ldapInfoLog.info('compose window onClose');
            let newwin = winref.get();
            if ( newwin && newwin.document ) ldapInfo.unLoad(newwin);
            ldapInfoLog.info('compose window unLoad done');
            return result;
          })[0] );
        }
      }
      if ( aWindow._ldapinfoshow.hookedFunctions.length ) {
        ldapInfoLog.info('create popup');
        this.createPopup(aWindow);
        aWindow.addEventListener("unload", ldapInfo.onUnLoad, false);
      }
    }catch(err) {
      ldapInfoLog.logException(err);
    }
  },
  
  initComposeListener: function(doc, init) {
    ldapInfoLog.info((init ? 'install' : 'unload') + ' compose window listener');
    let input = doc.getElementById(composeWindowInputID);
    let inputMRC = doc.getElementById('box-to'); // MRC Compose addon
    if ( inputMRC ) input = inputMRC.parentNode; // actually TB standard mode should be able to use the parentNode too.
    if ( input ) {
      if ( init ) {
        input.addEventListener('focus', ldapInfo.composeWinUpdate, true); // use capture as we are at top
        input.addEventListener('keypress', ldapInfo.composeWinUpdate, true);
        input.addEventListener('click', ldapInfo.composeWinUpdate, true);
      } else {
        input.removeEventListener('focus', ldapInfo.composeWinUpdate, true);
        input.removeEventListener('keypress', ldapInfo.composeWinUpdate, true);
        input.removeEventListener('click', ldapInfo.composeWinUpdate, true);
      }
    }
  },
  
  composeWinUpdate: function(event) {
    let cell = event.target;
    if ( !cell || !cell.id || !cell.ownerDocument || !event.type ) return;
    if ( !ldapInfo.composeWinTimer ) ldapInfo.composeWinTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    ldapInfo.composeWinTimer.initWithCallback( function() { // use timer to prevent early search before user type all the characters
      ldapInfo.delayedComposeWinUpdate(cell);
    }, ( event.type == 'focus' ) ? 0 : 500, Ci.nsITimer.TYPE_ONE_SHOT );
  },
  
  delayedComposeWinUpdate: function(cell) {
    try {
      let doc = cell.ownerDocument;
      if ( cell.id.startsWith("addressCol") ) { // TB standard input start with addressCol, MRC just use one text box
        // addressCol2#2
        let splitResult = /^addressCol([\d])#(\d+)/.exec(cell.id);
        if ( splitResult == null ) return;
        let [, col, row] = splitResult;
        if ( col == 1 ) cell = doc.getElementById('addressCol2#' + row ); //cell.parentNode.nextSibling.firstChild not work with Display Thunderbird Contacts Addon
        if ( !cell || typeof(cell.value) == 'undefined' ) return;
        if ( cell.value == '' && row > 1 ) cell = doc.getElementById('addressCol2#' + (row -1)); // use last row if current row is empty
      }
      let value = cell.value;
      if ( value == '' || value.indexOf('@') < 0 ) return;
      let emails = GlodaUtils.parseMailAddresses(value.toLowerCase()).addresses;
      let email = emails[0];
      if ( emails.length > 1 ) {
        let comma = value.lastIndexOf(',', cell.selectionEnd > 0 ? cell.selectionEnd - 1 : 0) + 1; // selectionEnd is index of the character after the selection
        value = value.substr(0, comma).replace(/[^,]/g,'');
        let number = value.length;
        if ( number == emails.length ) number = emails.length - 1;
        if ( number >= 0 && number < emails.length ) email = emails[number];
      }

      let win = doc.defaultView;
      let imageID = boxID + 'compose';
      let image = doc.getElementById(imageID);
      if ( !image ) {
        let refId = ldapInfoUtil.options.show_pics_left_side ? 'addresses-box': 'attachments-box';
        let refEle = doc.getElementById(refId);
        if ( !refEle ){
          ldapInfoLog.info("can't find ref " + refId);
          return;
        }
        let box = doc.createElementNS(XULNS, "vbox");
        box.id = boxID;
        image = doc.createElementNS(XULNS, "image");
        let innerbox = doc.createElementNS(XULNS, "hbox");
        let overlay = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
        innerbox.classList.add('ldapInfoInnerBox');
        innerbox.insertBefore(overlay, null);
        innerbox.insertBefore(image, null);
        box.insertBefore(innerbox, null);
        overlay.tooltip = innerbox.tooltip = tooltipID;
        innerbox.setAttribute('context', tooltipID);
        image.classList.add('ldapInfoImage');
        refEle.parentNode.insertBefore(box, refEle);
        win._ldapinfoshow.createdElements.push(boxID);
        image.id = imageID;
        image.maxHeight = 128;
      } else if ( image.parentNode.address == email ) return;
      image.setAttribute('src', "chrome://messenger/skin/addressbook/icons/contact-generic.png");
      image.parentNode.firstChild.address = image.parentNode.address = email; // so this overlay can also trigger popup tooltip
      ldapInfo.updateImgWithAddress(image, email, win, null);
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
      if ( typeof(aWindow._ldapinfoshow) != 'undefined' ) {
        ldapInfoLog.info('unhook');
        aWindow.removeEventListener("unload", ldapInfo.onUnLoad, false);
        aWindow._ldapinfoshow.hookedFunctions.forEach( function(hooked) {
          hooked.unweave();
        } );
        let doc = aWindow.document;
        if ( ( typeof(aWindow.MessageDisplayWidget) != 'undefined' || aWindow.gThreadPaneCommandUpdater ) && typeof(aWindow.gMessageListeners) != 'undefined' ) {
          ldapInfoLog.info('gMessageListeners unregister');
          for( let i = aWindow.gMessageListeners.length - 1; i >= 0; i-- ) {
            let listener = aWindow.gMessageListeners[i];
            if ( listener.winref && listener.winref.get() === aWindow ) {
              ldapInfoLog.info('gMessageListeners unregistr index ' + i);
              aWindow.gMessageListeners.splice(i, 1);
              break;
            }
          }
        }
        if ( aWindow._ldapinfoshow.TCObserver ) {
          Services.obs.removeObserver(aWindow._ldapinfoshow.TCObserver, "Conversations", false);
        }
        ldapInfo.initComposeListener(doc, false);
        for ( let node of aWindow._ldapinfoshow.createdElements ) {
          if ( typeof(node) == 'string' ) node = doc.getElementById(node);
          if ( node && node.parentNode ) {
            ldapInfoLog.info("removed node " + node);
            node.parentNode.removeChild(node);
          }
        }
        this.modifyTooltip4HeaderRows(aWindow, false); // remove
        let image = doc.getElementById(addressBookImageID);
        if ( !image ) image = doc.getElementById(addressBookDialogImageID);
        if ( image ) { // address book
          ldapInfoLog.info('unload addressbook image property');
          delete image.ldap;
          delete image.address;
          delete image.validImage;
          image.removeAttribute('tooltip');
        }
        delete aWindow._ldapinfoshow;
      }
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
    ldapInfoLog.info('unload done');
  },

  cleanup: function() {
    try {
      ldapInfoLog.info('ldapInfo cleanup');
      this.abListener.remove();
      ldapInfoSprintf.sprintf.cache = null;
      ldapInfoSprintf.sprintf = null;
      if ( this.timer ) this.timer.cancel();
      if ( this.composeWinTimer ) this.composeWinTimer.cancel();
      this.timer = this.composeWinTimer = null;
      this.clearCache();
      ldapInfoFetch.cleanup();
      ldapInfoFetchOther.cleanup();
      ldapInfoUtil.cleanup();
      ldapInfoLog.cleanup();
    } catch (err) {
      ldapInfoLog.logException(err);  
    }
    ldapInfoLog.info('ldapInfo cleanup done');
    ldapInfoLog = ldapInfoaop = ldapInfoFetch = ldapInfoFetchOther = ldapInfoUtil = ldapInfoSprintf = null;
  },
  
  clearCache: function(clean) {
    if ( clean && allServices.indexOf(clean) >= 0 ) {
      ldapInfoLog.info('clear only ' + clean);
      for ( let address in this.cache ) {
        this.cache[address][clean] = { state: ldapInfoUtil.STATE_INIT };
      }
      return;
    }
    ldapInfoLog.info('clearCache all');
    // can't use this.a = this.b = {}, will make 2 variables point the same place    
    this.cache = {};
    delete this.ldapServers;
    ldapInfoFetch.clearCache();
    ldapInfoFetchOther.clearCache();
  },
  
  updatePopupInfo: function(image, aWindow, event, headerRow) {
    try {
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
      // for context popup, make it autohide
      if ( event ) tooltip.setAttribute('noautohide', ( event.rangeParent && event.rangeParent.className ? "false" : "true" ));

      let attribute = {};
      if ( image != null && typeof(image) != 'undefined' && image.address && this.cache[image.address] ) {
        let cache = this.cache[image.address];
        tooltip.address = image.address;
        for ( let place of allServices ) {
          if ( ldapInfoUtil.options['load_from_' + place] && cache[place] && cache[place].state == ldapInfoUtil.STATE_DONE && cache[place].src ) {
            if ( !attribute['_image'] ) attribute['_image'] = []; // so it will be the first one to show
            //if ( place == 'domain_wildcard' && attribute['_image'].length > 0 ) continue; // disable show domain wildcard photo in popup
            if ( attribute['_image'].indexOf( cache[place].src ) < 0 ) attribute['_image'].push( cache[place].src );
          }
        }
        tooltip.setAttribute('label', 'Contact Information for ' + image.address);
        let oneRemote = false;
        for ( let place of allServices ) { // merge all attribute from different sources into attribute
          if ( ldapInfoUtil.options['load_from_' + place] && cache[place] ) {
            if ( cache[place].state == ldapInfoUtil.STATE_QUERYING  && !cache[place]._Status ) cache[place]._Status = [ place[0].toUpperCase() + place.slice(1) + ' ' + ldapInfoUtil.CHAR_QUERYING ];
            if ( cache[place].state == ldapInfoUtil.STATE_DONE && ['facebook', 'linkedin', 'flickr', 'google', 'gravatar'].indexOf(place) >= 0 && !ldapInfoUtil.options.load_from_all_remote ) {
              if (!oneRemote) oneRemote = true; else continue;
            }
            for ( let i in cache[place] ) {
              if ( ['src', 'state'].indexOf(i) >= 0 ) continue;
              if ( cache[place].state == ldapInfoUtil.STATE_QUERYING && i != '_Status' ) continue; // show all progress
              // ignore attribute in addressbook if has valid ldap info, except _Status
              if ( place == 'addressbook' && ldapInfoUtil.options.load_from_ldap && cache.ldap.state == ldapInfoUtil.STATE_DONE && cache.ldap._dn && ( i != '_Status' || !cache.addressbook.src ) ) continue;
              if ( !attribute[i] ) attribute[i] = [];
              for ( let value of cache[place][i] ) {
                if ( attribute[i].indexOf(value) < 0 ) attribute[i].push(value);
              }
            }
          }
        }
        if ( attribute._Status && attribute._Status[0] != 'Cached' ) {
          if ( !cache.changed ) attribute._Status.unshift('Cached');
          let s = attribute._Status; delete attribute._Status; attribute._Status = s; // move to the last line
        }
      } else if ( headerRow ) {
        attribute = { '': [headerRow.tooltiptextSave || headerRow.getAttribute('fullAddress') || ""] };
      }
      for ( let p in attribute ) {
        let va = attribute[p];
        if ( va.length <= 0 ) continue;
        let v = va[0];
        if ( va.length == 1 && ( typeof(v) == 'undefined' || v == '' ) ) continue;
        if ( va.length > 1 && p != '_image' ) {
          if ( p == "_Status" ) v = va.join(', '); else v = va.sort().join(', ');
        }
        if ( v && typeof(v.toString) == 'function' ) v = v.toString(); // in case v is number, it has no indexOf
        let row = doc.createElementNS(XULNS, "row");
        let col1 = doc.createElementNS(XULNS, "description");
        let col2;
        if ( p == '_image' ) {
          col1.setAttribute('value', '');
          col2 = doc.createElementNS(XULNS, "hbox");
          col2.setAttribute('align', 'end');
          for ( let src of va ) {
            let vbox = doc.createElementNS(XULNS, "vbox");
            let newImage = doc.createElementNS(XULNS, "image");
            newImage.addEventListener('error', this.loadImageFailed, false); // duplicate listener will be discard
            newImage.addEventListener('load', this.loadImageSucceed, false);
            newImage.address = image.address;
            newImage.setAttribute('src', this.getImageSrcConsiderOffline(src));
            newImage.maxHeight = 128;
            vbox.insertBefore(newImage,null);
            col2.insertBefore(vbox,null);
          }
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
              let url = ldapInfoSprintf.sprintf( ldapInfoUtil.options['click2dial'], "" + event.target.textContent );
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
  
  ldapCallback: function(callbackData) { // 'this' maybe not ldapInfo
    try {
      let my_address = callbackData.address;
      ldapInfoLog.info('ldapCallback for ' + my_address);
      let aImg = callbackData.image;
      if ( my_address == aImg.address ) {
        ldapInfo.setImageSrcFromCache(aImg);
        ldapInfo.updatePopupInfo(aImg, callbackData.win.get(), null, null);
      }
    } catch (err) {
      ldapInfoLog.logException(err);
    }
  },
  
  loadImageSucceed: function(event) {
    let aImg = event.target;
    if ( !aImg || !aImg.address ) return;
    aImg.removeEventListener('load', ldapInfo.loadImageSucceed, false);
    aImg.removeEventListener('error', ldapInfo.loadImageFailed, false);
  },
  
  loadImageFailed: function(event) {
    let aImg = event.target;
    if ( !aImg || !aImg.address ) return;
    ldapInfoLog.info('loadImageFailed :' + aImg.getAttribute('src'));
    aImg.setAttribute('badsrc', aImg.getAttribute('src'));
    aImg.setAttribute('src', "chrome://messenger/skin/addressbook/icons/remote-addrbook-error.png"); // this should trigger loadImageSucceed
    aImg.validImage = 0;
  },
  
  getImageSrcConsiderOffline: function(src) {
    let useImage = !Services.io.offline || ["data:", "chrome://", "file://"].some( function(proto) {
        return ( src.indexOf(proto) == 0 );
    } );
    return useImage ? src : "chrome://messenger/skin/icons/offline.png";
  },
  
  setImageSrcFromCache: function(image) {
    let cache = this.cache[image.address];
    if ( typeof( cache ) == 'undefined' ) return;
    let images = [];
    let hasSocialNoPic = false;
    for ( let place of allServices ) {
      if ( ldapInfoUtil.options['load_from_' + place] && cache[place] && [ldapInfoUtil.STATE_QUERYING, ldapInfoUtil.STATE_DONE].indexOf(cache[place].state) >= 0 ) { // with batch, querying might have pic too
        if ( cache[place].src ) {
          if ( servicePriority[place] > image.validImage && ( image.id != addressBookDialogImageID || place != 'addressbook' ) ) {
            image.addEventListener('error', this.loadImageFailed, false); // duplicate listener will be discard
            image.addEventListener('load', this.loadImageSucceed, false);
            image.setAttribute('src', this.getImageSrcConsiderOffline(cache[place].src));
            image.validImage = servicePriority[place];
            ldapInfoLog.info('using src of ' + place + " for " + image.address + " from " + cache[place].src.substr(0,100));
            //break; // the priority is decrease
          }
          if ( place != 'domain_wildcard' && images.indexOf( cache[place].src ) < 0 ) images.push( cache[place].src ); // ignore domain wildcard pic when count number of images
        } else if ( servicePriority[place] < servicePriority['ldap'] && cache[place]._Status && cache[place]._Status[0] && cache[place]._Status[0].endsWith(ldapInfoUtil.CHAR_NOPIC) ) {
          hasSocialNoPic = true;
        }
      }
    }
    if ( image.classList.contains('ldapInfoImage') ) { // added by me, so can has overlay
      if ( images.length >= 2 || hasSocialNoPic ) {
        image.parentNode.firstChild.setAttribute('MultiSrc', images.length >= 2 ? 'true' : 'false'); 
        image.parentNode.firstChild.classList.add('ldapInfoMoreInfo');
      } else {
        image.parentNode.firstChild.classList.remove('ldapInfoMoreInfo');
      }
    } else {
      if ( images.length >= 2 || hasSocialNoPic ) {
        image.setAttribute('MultiSrc', images.length >= 2 ? 'true' : 'false'); 
        image.classList.add('ldapInfoMoreInfo');
      } else {
        image.classList.remove('ldapInfoMoreInfo');
      }
    }
  },

  showPhoto: function(aMessageDisplayWidget, folder, winref) {
    try {
      //aMessageDisplayWidget.folderDisplay.selectedMessages array of nsIMsgDBHdr, can be 1
      //                                   .selectedMessageUris array of uri
      //                     .displayedMessage null if mutil, nsImsgDBHdr =>mime2DecodedAuthor,mime2DecodedRecipients [string]
      ldapInfoLog.info("showPhoto " + aMessageDisplayWidget + ":" + folder + ":" + winref);
      if ( !aMessageDisplayWidget ) return;
      let folderDisplay = ( typeof(folder) != 'undefined' && folder ) ? folder : aMessageDisplayWidget.folderDisplay;
      let win = winref.get();
      if ( !win || !win.document ) return;
      if ( !folderDisplay && ldapInfoUtil.isSeaMonkey && win.gFolderDisplay ) folderDisplay = win.gFolderDisplay;
      if ( !folderDisplay ) return;
      ldapInfoLog.info("showPhoto check done");
      let doc = win.document;
      let addressList = [];
      //let isSingle = aMessageDisplayWidget.singleMessageDisplay; // only works if loadComplete
      let isSingle = (folderDisplay.selectedCount <= 1);
      // check if Thunderbird Conversations Single Mode, which is also multiview
      let isTC = false;
      let TCSelectedHdr = null;
      if ( typeof(win.Conversations) != 'undefined' && win.Conversations.currentConversation
        && win.Conversations.monkeyPatch && win.Conversations.monkeyPatch._undoFuncs && win.Conversations.monkeyPatch._undoFuncs.length) { // check _undoFuncs also as when TC unload currentConversation may still there, a bug
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
      if ( ldapInfoUtil.isSeaMonkey ) {
        let header = doc.getElementById("expandedHeaderView");
        if ( header && header.collapsed ) isSingle = false;
      }      
      let imageLimit = isSingle ? ldapInfoUtil.options.numberLimitSingle : ldapInfoUtil.options.numberLimitMulti;
      if ( isSingle ) {
        let deck = doc.getElementById(msgHeaderViewDeck);
        if ( deck && deck.selectedPanel.id != 'expandedHeaderView' ) isSingle = false; // might be compact header, but still use large limit
      }
      let targetMessages = isTC ? win.Conversations.currentConversation.msgHdrs : folderDisplay.selectedMessages;

      for ( let selectMessage of targetMessages ) {
        if ( ldapInfo.disableForMessage(selectMessage) ) {
          ldapInfoLog.info('not for server ' + selectMessage.folder.server.key + ":" + selectMessage.folder.server.prettyName);
          continue;
        }
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
          if ( address.indexOf('@') >= 0 && addressList.indexOf(address) < 0 ) { // [mitch] only add addresses containing '@'
            addressList.push(address);
          }
          if ( addressList.length >= imageLimit ) break;
        }
        if ( addressList.length >= imageLimit ) break;
      }

      let left = ldapInfoUtil.options.show_pics_left_side;
      let refId = left ? 'expandedHeadersBox' : 'otherActionsBox'; // single
      if ( ldapInfoUtil.isSeaMonkey ) refId =  left ? "collapsedHeaderView" : "expandedAttachmentBox"; // single
      if ( !isSingle ) refId = ldapInfoUtil.isSeaMonkey ? "messagesBox" : 'messagepanebox';
      let refEle = doc.getElementById(refId);
      if ( !refEle ){
        ldapInfoLog.info("can't find ref " + refId);
        return;
      }
      let box = doc.getElementById(boxID);
      if ( !box ) {
        box = doc.createElementNS(XULNS, "box");
        box.id = boxID;
        win._ldapinfoshow.createdElements.push(boxID);
      } else {
        box.parentNode.removeChild(box);
        while (box.firstChild) {
          box.removeChild(box.firstChild);
        }
      }
      box.setAttribute('orient', isSingle ? 'horizontal' : 'vertical'); // use attribute so my css attribute selector works
      refEle.parentNode.insertBefore(box, isSingle || left ? refEle : null);
      
      for ( let address of addressList ) {
        ldapInfoLog.info('show image for ' + address);
        // use XUL image element for chrome://generic.png
        // image within html doc won't ask password
        let image = doc.createElementNS(XULNS, "image");
        let innerbox = doc.createElementNS(XULNS, isSingle ? "vbox" : "hbox"); // prevent from image resize
        //let innerbox = doc.createElementNS(XULNS, "stack"); // stack can also used to postioning, but need more items
        let overlay = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
        innerbox.classList.add('ldapInfoInnerBox');
        innerbox.insertBefore(overlay, null);
        innerbox.insertBefore(image, null);
        box.insertBefore(innerbox, null);
        overlay.address = innerbox.address = address; // so this overlay can also trigger popup tooltip
        overlay.tooltip = innerbox.tooltip = tooltipID;
        innerbox.setAttribute('context', tooltipID);
        image.id = boxID + address; // for header row to find me
        image.maxHeight = addressList.length <= 8 ? 64 : 48;
        image.setAttribute('src', "chrome://messenger/skin/addressbook/icons/contact-generic-tiny.png");
        image.classList.add('ldapInfoImage');
        ldapInfo.updateImgWithAddress(image, address, win, null);
      } // all addresses
      
      if ( isTC && addressList.length ) { // for TB Conversations Contacts
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
                ldapInfo.updateImgWithAddress(imageNode, authorEmail, win, null);
              }
            }
          }
        } );
      }
      ldapInfoLog.info("showPhoto done");
    } catch(err) {
        ldapInfoLog.logException(err);
    }
  },
  
  updateImgWithAddress: function(image, address, win, card) {
    try {
      // For address book, it reuse the same iamge, so can't use image as data container because user may quickly change the selected card
      if ( !address ) {
        image.removeAttribute('tooltip');
        image.removeAttribute('context');
        return image.classList.remove('ldapInfoMoreInfo');
      }
      if ( typeof( ldapInfo.ldapServers ) == 'undefined' && ldapInfoUtil.options.load_from_ldap ) ldapInfo.getLDAPFromAB();
      image.address = address; // used in callback verification, still the same address?
      image.tooltip = tooltipID;
      image.setAttribute('context', tooltipID); // when right click, show full panel when it's too tall
      image.validImage = 0;
      
      let cache = this.cache[address];
      if ( typeof( this.cache[address] ) == 'undefined' ) { // create empty one
        ldapInfoLog.info('new cache entry for ' + address);
        cache = this.cache[address] = {}; // same object
        allServices.forEach( function(place) {
          cache[place] = {state: ldapInfoUtil.STATE_INIT};
        } );
      }
      // no negtaive cache, reset state if nouser
      ['local_dir', 'domain_wildcard'].forEach( function(place) {
        if ( cache[place]._Status && cache[place]._Status[0] && cache[place]._Status[0].endsWith(ldapInfoUtil.CHAR_NOUSER) ) cache[place].state = ldapInfoUtil.STATE_INIT;
      } );
      if ( [addressBookImageID, addressBookDialogImageID].indexOf(image.id) >= 0 ) {
        if ( typeof(win.defaultPhotoURI) != 'undefined' && image.getAttribute('src') != win.defaultPhotoURI ) { // addressbook item has photo
          image.validImage = servicePriority.addressbook;
        }
      }
      let callbackData = { image: image, address: address, win: Cu.getWeakReference(win), callback: ldapInfo.ldapCallback, cache: cache };
      let changed = false, useLDAP = false, mailid, mailDomain;
      let match = address.match(/(\S+)@(\S+)/);
      if ( match && match.length == 3 ) [, mailid, mailDomain] = match;
      for ( let place of allServices ) {
        if ( [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(cache[place].state) >= 0 ) delete cache[place]._Status;
      }
      for ( let place of allServices ) {
        if ( ldapInfoUtil.options['load_from_' + place] && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_QUERYING, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(cache[place].state) >= 0 ) {
          if ( place == 'local_dir') { // also for domain_wildcard
            changed |= ldapInfo.getPhotoFromLocalDir(address, mailDomain, callbackData); // will change cache sync
          } else if ( place == 'addressbook') {
            changed = true;
            ldapInfo.getPhotoFromAB(address, callbackData); // will change cache sync
          } else if ( place == 'ldap') {
            let [ldapServer, filter, baseDN, uuid, ldapCard] = [null, null, null, null, null];
            let scope = Ci.nsILDAPURL.SCOPE_SUBTREE;
            if ( card ) { // get LDAP server from card itself to avoid using wrong servers
              if ( card.directoryId && card.QueryInterface ) { // card detail dialog
                try {
                  ldapCard = card.QueryInterface(Ci.nsIAbLDAPCard);
                } catch(err) {}; // might be NOINTERFACE
                if ( ldapCard ) {
                  filter = '(objectclass=*)';
                  baseDN = ldapCard.dn;
                  scope = Ci.nsILDAPURL.SCOPE_BASE;
                  uuid = ldapCard.directoryId;
                }
              }
              if ( !uuid && win.gDirectoryTreeView && win.gDirTree && win.gDirTree.currentIndex > 0 ) {
                uuid = win.gDirectoryTreeView.getDirectoryAtIndex(win.gDirTree.currentIndex).uuid;
              }
              if ( uuid && typeof(ldapInfo.ldapServers[uuid]) != 'undefined' ) ldapServer = ldapInfo.ldapServers[uuid];
            }
            if ( !ldapServer ) { // try to match mailDomain
              for ( let id in ldapInfo.ldapServers ) {
                if ( ldapInfo.ldapServers[id]['prePath'].toLowerCase().indexOf('.' + mailDomain) >= 0 || ldapInfo.ldapServers[id]['baseDn'].indexOf(mailDomain) >= 0 || ldapInfo.ldapServers[id]['dirName'].indexOf(mailDomain) >= 0 ) {
                  uuid = id;
                  ldapServer = ldapInfo.ldapServers[id];
                  break;
                }
              }
            }
            if ( !ldapServer && ldapInfoUtil.options.ldap_ignore_domain ) {
              for ( let id in ldapInfo.ldapServers ) {
                uuid = id;
                ldapServer = ldapInfo.ldapServers[id];
                break;
              }
            }
            if ( ldapServer ) {
              if ( !filter ) {
                try {
                  let parameter = {email: address, uid: mailid, domain: mailDomain};
                  // filter: (|(mail=*spe*)(cn=*spe*)(givenName=*spe*)(sn=*spe*))
                  filter = ldapInfoSprintf.sprintf( ldapInfoUtil.options.filterTemplate, parameter );
                } catch (err) {
                  ldapInfoLog.log("filterTemplate is not correct: " + ldapInfoUtil.options.filterTemplate, "Exception");
                  break;
                }
              }
              if ( !baseDN ) baseDN = ldapServer.baseDn;
              changed = useLDAP = true;
              cache.ldap.state = ldapInfoUtil.STATE_QUERYING;
              ldapInfoFetch.queueFetchLDAPInfo(callbackData, ldapServer.prePath, baseDN, ldapServer.authDn, filter, ldapInfoUtil.options.ldap_attributes, scope, ldapServer.spec, uuid);
            } else {
              cache.ldap.state = ldapInfoUtil.STATE_DONE; // no ldap server, not an error
              cache.ldap._Status = ["No LDAP server available"];
            }
          } else { // fetch other
            if ( ( useLDAP || cache.ldap.state == ldapInfoUtil.STATE_QUERYING || ( cache.ldap.state == ldapInfoUtil.STATE_DONE && cache.ldap._dn ) ) && !ldapInfoUtil.options.load_from_remote_always ) break;
            if ( !ldapInfoUtil.options.load_from_all_remote && ( ( ldapInfoUtil.options.load_from_facebook && cache.facebook.src )
                                                              || ( ldapInfoUtil.options.load_from_google && cache.google.src )
                                                              || ( ldapInfoUtil.options.load_from_linkedin && cache.linkedin.src )
                                                              || ( ldapInfoUtil.options.load_from_flickr && cache.flickr.src )
                                                              || ( ldapInfoUtil.options.load_from_gravatar && cache.gravatar.src ) ) ) break;
            if ( ! ( ldapInfoUtil.options.load_from_facebook || ldapInfoUtil.options.load_from_linkedin || ldapInfoUtil.options.load_from_flickr || ldapInfoUtil.options.load_from_google || ldapInfoUtil.options.load_from_gravatar ) ) break;
            callbackData.mailid = mailid;
            callbackData.mailDomain = mailDomain;
            changed = true;
            ldapInfoFetchOther.queueFetchOtherInfo(callbackData);
            break;
          }
        } // need load
      } // all services
      cache.changed = changed;
      ldapInfoLog.info('cached.changed ' + changed);
      this.setImageSrcFromCache(image);
      this.updatePopupInfo(image, win, null, null);
    } catch(err) {
       ldapInfoLog.logException(err);
    }
  },

};
