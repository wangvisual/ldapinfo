// copy from ldap_contact_photo https://addons.mozilla.org/en-US/thunderbird/addon/ldap-contact-photo/ by Piotr Piastucki
// license: MPL

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetch"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");

let ldapInfoFetch =  {
    ldapConnections: {}, // {dn : connection}
    queue: [], // request queue

    getPasswordForServer: function (serverUrl, hostName, login, force, realm) {
        let passwordManager = Services.logins;
        if (passwordManager) {
            
            let password = { value: "" };
            let check = { value: false };
            let oldLoginInfo;
            try {    
                let logins = passwordManager.findLogins({}, serverUrl, null, realm);            
                let foundCredentials = false;
                for (let i = 0; i < logins.length; i++) {
                    if (logins[i].username == '' || logins[i].username == login) {
                        password.value = logins[i].password;
                        foundCredentials = true;
                        oldLoginInfo = logins[i];
                        break;
                    }
                }
                if(foundCredentials & (!force)) {
                    return password.value;
                }
            } catch(e) {}
            let strBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
            let strBundle2 = Services.strings.createBundle('chrome://passwordmgr/locale/passwordmgr.properties');

            let prompts = Services.prompt;
            let okorcancel = prompts.promptPassword(null, strBundle.GetStringFromName("authPromptTitle"), 
                                strBundle.formatStringFromName("authPromptText", [hostName + " photo"], 1),
                                password, 
                                strBundle2.GetStringFromName("rememberPassword"),
                                check);
            if(!okorcancel) {
                return;
            }
            if(check.value) {
                let nsLoginInfo = new Cc("@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");     
                let loginInfo = new nsLoginInfo(serverUrl, null, realm, "", password.value,"", "");
                try {        
                    if(oldLoginInfo) {
                      passwordManager.modifyLogin(oldLoginInfo, loginInfo);
                    } else {
                      passwordManager.addLogin(loginInfo);
                    }
                } catch(e){}
            }
            return password.value;
        }
        return false;
    },
    
    getErrorMsg: function(pStatus) {
        for ( let p in Cr ) {
            if ( Cr[p] == pStatus ) {
                return p;
            }
        }
        return 'Unknown Error';
    },

    photoLDAPMessageListener: function (aImg, connection, bindPassword, dn, scope, filter, attributes, callback) {
        this.aImg = aImg;
        this.connection = connection;
        this.bindPassword = bindPassword;
        this.dn = dn;
        this.scope = scope;
        this.filter = filter;
        this.attributes = attributes;
        this.callback = callback;
        this.QueryInterface = function(iid) {
            if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsILDAPMessageListener))
                return this;
            throw Cr.NS_ERROR_NO_INTERFACE;
        };
        
        this.onLDAPInit = function(pConn, pStatus) {
            let fail = "";
            try {
                ldapInfoLog.log("onLDAPInit");
                if ( pStatus === Cr.NS_OK ) {
                    let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                    ldapOp.init(pConn, this, null);
                    ldapOp.simpleBind(this.bindPassword);
                    return;
                }
                fail = pStatus.toString(16) + ": " + ldapInfoFetch.getErrorMsg(pStatus);
            } catch (err) {
                ldapInfoLog.logException(err);
                fail = "exception!";
            }
            ldapInfoLog.log("onLDAPInit failed with " + fail);
            this.connection = null;
            this.aImg.ldap['_Status'] = [fail];
            ldapInfoFetch.callBackAndRunNext(this.callback, this.aImg); // with failure
        };
        this.startSearch = function() {
            let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
            ldapOp.init(this.connection, this, null);
            ldapOp.searchExt(this.dn, this.scope, this.filter, this.attributes, /*aTimeOut*/5, /*aSizeLimit*/1);
        };
        this.onLDAPMessage = function(pMsg) {
            try {
                switch (pMsg.type) {
                    case Ci.nsILDAPMessage.RES_BIND :
                        if ( pMsg.errorCode == Ci.nsILDAPErrors.SUCCESS ) {
                            ldapInfoFetch.ldapConnections[this.dn] = this.connection;
                            this.startSearch();
                        } else {
                            ldapInfoLog.log('bind fail');
                            pMsg.operation.abandonExt();
                            this.aImg.ldap['_Status'] = ['Bind Error ' + pMsg.errorCode.toString(16)];
                            this.connection = null;
                            ldapInfoFetch.callBackAndRunNext(this.callback, this.aImg); // with failure
                        }
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_ENTRY :
                        let count = new Object();
                        let attrs = pMsg.getAttributes(count);
                        let image_bytes = null;
                        for(let attr of attrs) {
                            if (attr.toLowerCase() == "thumbnailphoto" || (attr.toLowerCase() == "jpegphoto" )) {
                                if ( !image_bytes && !aImg.validImage ) {
                                    let values = pMsg.getBinaryValues(attr, count); //[xpconnect wrapped nsILDAPBERValue]
                                    if (values && values.length > 0 && values[0]) {
                                        image_bytes = values[0].get(count);
                                    }
                                }
                            } else {
                                if ( typeof (aImg.ldap) == 'undefined' ) aImg.ldap = {};
                                aImg.ldap[attr] = pMsg.getValues(attr, count);
                            }
                        }
                        if (image_bytes && image_bytes.length > 2) {
                            let encImg = aImg.ownerDocument.defaultView.window.btoa(String.fromCharCode.apply(null, image_bytes));
                            aImg.src = "data:image/jpeg;base64," + encImg;
                            aImg.validImage = true;
                        }
                        aImg.ldap['_dn'] = [pMsg.dn];
                        aImg.ldap['_Status'] = ['Query finished'];
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
                    default:
                        ldapInfoLog.log('operation done');
                        this.connection = null;
                        ldapInfoFetch.callBackAndRunNext(this.callback, this.aImg);
                        break;
                }
            } catch (err) {
                ldapInfoLog.logException(err);
            }
        };
    },

    clearCache: function () {
        ldapInfoLog.log("clear ldapConnections");
        this.ldapConnections = {};
    },
    
    cleanup: function() {
        this.clearCache();
        Cu.unload("chrome://ldapInfo/content/log.jsm");
        ldapInfoLog = null;
    },
    
    callBackAndRunNext: function(callback, aImg) {
      ldapInfoLog.log('callBackAndRunNext');
      ldapInfoFetch.queue.shift(); // remove finished request
      if ( typeof(aImg.ownerDocument) != 'undefined' && typeof(aImg.ownerDocument.defaultView) != 'undefined' && typeof(aImg.ownerDocument.defaultView.window) != 'undefined' ) {
        ldapInfoLog.log('call back settimeout');
        aImg.ownerDocument.defaultView.window.setTimeout( function(){callback(aImg);}, 0 ); // make it async, then I can run next immediately
      } else {
        ldapInfoLog.log('call back direct');
        callback(aImg);
      }
      if (ldapInfoFetch.queue.length >= 1) {
          ldapInfoLog.log('RunNext');
          this.fetchLDAPInfo.apply(ldapInfoFetch, ldapInfoFetch.queue[0]);
      }
      ldapInfoLog.log('callBackAndRunNext done');
    },
    
    queueFetchLDAPInfo: function(host, basedn, binddn, filter, attribs, aImg, callback) {
        ldapInfoLog.log('queueFetchLDAPInfo');
        this.queue.push(arguments);
        if (this.queue.length === 1) {
            ldapInfoLog.log('first');
            this.fetchLDAPInfo.apply(this, arguments);
        }
    },

    fetchLDAPInfo: function (host, basedn, binddn, filter, attribs, aImg, callback) {
        ldapInfoLog.logObject(arguments,'args',0);
        if ( !aImg ) return;
        try {
            let password = null;
            // ldap://directory.foo.com/
            // ldap://directory.synopsys.com/o=synopsys.com??sub?(objectclass=*)
            let prePath = "ldap://" + host + "/";
            let urlSpec = "ldap://" + host + "/" + basedn + "?" + attribs + "?sub?" +  filter;
            if ( 0 ) {
                password = ldapInfoFetch.getPasswordForServer(prePath, host, binddn, false, urlSpec);
                if (password == "") password = null;
                else if (!password) return;
            }
            let ldapconnection = this.ldapConnections[basedn];
            if (ldapconnection) {
                ldapInfoLog.log("use cached connection");
                let connectionListener = new ldapInfoFetch.photoLDAPMessageListener(aImg, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs, callback);
                try {
                    connectionListener.startSearch();
                    return;
                } catch (e) {
                    this.clearCache();
                }
            }
            ldapInfoLog.log("create new connection");
            ldapconnection = Cc["@mozilla.org/network/ldap-connection;1"].createInstance().QueryInterface(Ci.nsILDAPConnection);
            let connectionListener = new ldapInfoFetch.photoLDAPMessageListener(aImg, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs, callback);
            let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
            ldapconnection.init(url, binddn, connectionListener, /*nsISupports aClosure*/null, ldapconnection.VERSION3);
        } catch (err) {
            ldapInfoLog.logException(err);
            this.callBackAndRunNext(callback, aImg); // with failure
        }
    }
}