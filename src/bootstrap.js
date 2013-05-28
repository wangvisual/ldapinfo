// Opera.Wang+ldapInfo@gmail.com GPL/MPL
"use strict";

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
// if use custom resouce, refer here
// http://mdn.beonex.com/en/JavaScript_code_modules/Using.html

const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
const userCSS = "chrome://ldapInfo/content/ldapInfo.css";
const targetWindows = [ "mail:3pane", "msgcompose", "mail:addressbook", "mail:messageWindow" ];
const targetLocations = [ "chrome://messenger/content/addressbook/abEditCardDialog.xul" ];

function loadIntoWindow(window) {
  if ( !window ) return; // windows is the global host context
  let document = window.document; // XULDocument
  let type = document.documentElement.getAttribute('windowtype'); // documentElement maybe 'messengerWindow' / 'addressbookWindow'
  ldapInfoLog.log("windowtype " + type);
  if ( targetWindows.indexOf(type) < 0 && targetLocations.indexOf(window.location.href) < 0 ) return;
  ldapInfoLog.log("load");
  ldapInfo.Load(window);
}
 
var windowListener = {
  onOpenWindow: function(aWindow) {
    let onLoadWindow = function() {
      aWindow.removeEventListener("load", onLoadWindow, false);
      loadIntoWindow(aWindow);
    };
    aWindow.addEventListener("load", onLoadWindow, false);
  },
  windowWatcher: function(subject, topic) {
    if (topic == "domwindowopened") {
      windowListener.onOpenWindow(subject);
    }
  },
};

function startup(aData, aReason) {
  Cu.import("chrome://ldapInfo/content/log.jsm");
  Cu.import("chrome://ldapInfo/content/ldapInfo.jsm");
  // Load into any existing windows
  let windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    if ( domWindow.document.readyState == "complete"
    && ( targetWindows.indexOf(domWindow.document.documentElement.getAttribute('windowtype')) >= 0 || targetLocations.indexOf(domWindow.location.href) >= 0 ) ) {
      loadIntoWindow(domWindow);
    } else {
      windowListener.onOpenWindow(domWindow);
    }
  }
  // Wait for new windows
  Services.ww.registerNotification(windowListener.windowWatcher);
  // install userCSS, works for all document like userChrome.css, see https://developer.mozilla.org/en/docs/Using_the_Stylesheet_Service
  let uri = Services.io.newURI(userCSS, null, null);
  // validator warnings on the below line, ignore it
  if ( !sss.sheetRegistered(uri, sss.USER_SHEET) ) sss.loadAndRegisterSheet(uri, sss.USER_SHEET); // will be unregister when shutdown
}
 
function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN) return;
  Services.ww.unregisterNotification(windowListener.windowWatcher);
  let uri = Services.io.newURI(userCSS, null, null);
  if ( sss.sheetRegistered(uri, sss.USER_SHEET) ) sss.unregisterSheet(uri, sss.USER_SHEET);
 
  // Unload from any existing windows
  let windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    Services.console.logStringMessage('unload from window');
    ldapInfoLog.log(domWindow.document.documentElement.getAttribute('windowtype'));
    ldapInfo.unLoad(domWindow); // won't check windowtype as unload will check
    Services.console.logStringMessage('unload from window 2');
    //domWindow.removeEventListener("unload", onUnloadWindow, false);
    Services.console.logStringMessage('force GC CC');
    // Do CC & GC, comment out allTraces when release
    domWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils).garbageCollect(
      // Cc["@mozilla.org/cycle-collector-logger;1"].createInstance(Ci.nsICycleCollectorListener).allTraces()
    );
    Services.console.logStringMessage('force GC CC done');
  }
  Services.console.logStringMessage('shutdown almost done');
  ldapInfo.cleanup();
  Cu.unload("chrome://ldapInfo/content/ldapInfo.jsm");
  Cu.unload("chrome://ldapInfo/content/log.jsm");
  ldapInfo = ldapInfoLog = null;
  // flushStartupCache
  // Init this, so it will get the notification.
  //Cc["@mozilla.org/xul/xul-prototype-cache;1"].getService(Ci.nsISupports);
  Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  Cu.schedulePreciseGC( Cu.forceGC );
  Services.console.logStringMessage('scheduled PreciseGC');
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}
