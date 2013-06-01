// copy from ldap_contact_photo https://addons.mozilla.org/en-US/thunderbird/addon/ldap-contact-photo/ by Piotr Piastucki
// license: MPL
// Modified by Opera Wang to enable queue and timeout etc.

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetch"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");

let ldapInfoFetch =  {
    ldapConnections: {}, // {dn : connection}
    queue: [], // request queue
    lastTime: Date.now(), // last connection use time
    currentAddress: null,

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

    photoLDAPMessageListener: function (callbackData, connection, bindPassword, dn, scope, filter, attributes) {
        this.callbackData = callbackData;
        this.connection = connection;
        this.bindPassword = bindPassword;
        this.dn = dn;
        this.scope = scope;
        this.filter = filter;
        this.attributes = attributes;
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
                    this.callbackData.ldapOp = ldapOp;
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
            //this.callbackData.ldap['_filter'] = [this.filter];
            this.callbackData.ldap['_Status'] = [fail];
            ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
        };
        this.startSearch = function(cached) {
            try {
                let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                this.callbackData.ldapOp = ldapOp;
                ldapOp.init(this.connection, this, null);
                let timeout = 60;
                if ( cached ) timeout = 20;
                ldapOp.searchExt(this.dn, this.scope, this.filter, this.attributes, /*aTimeOut, not implemented yet*/timeout-1, /*aSizeLimit*/1);
                ldapInfoFetch.lastTime = Date.now();
                this.callbackData.timer = this.callbackData.win.setTimeout( function(){
                    ldapInfoLog.log("searchExt timeout " + timeout + " reached");
                    ldapOp.abandonExt();
                    ldapInfoFetch.clearCache();
                    ldapInfoFetch.callBackAndRunNext({address: 'retry'}); // retry current search
                }, timeout * 1000 );
            }  catch (err) {
                ldapInfoLog.log("search issue");
                ldapInfoLog.logException(err);
                this.callbackData.ldap['_Status'] = ["startSearch Fail"];
                ldapInfoFetch.clearCache();
                ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
            }
        };
        this.onLDAPMessage = function(pMsg) {
            try {
                switch (pMsg.type) {
                    case Ci.nsILDAPMessage.RES_BIND :
                        if ( pMsg.errorCode == Ci.nsILDAPErrors.SUCCESS ) {
                            ldapInfoFetch.ldapConnections[this.dn] = this.connection;
                            this.startSearch(false);
                        } else {
                            ldapInfoLog.log('bind fail');
                            pMsg.operation.abandonExt();
                            //this.callbackData.ldap['_filter'] = [this.filter];
                            this.callbackData.ldap['_Status'] = ['Bind Error ' + pMsg.errorCode.toString(16)];
                            this.connection = null;
                            ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
                        }
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_ENTRY :
                        let count = new Object();
                        let attrs = pMsg.getAttributes(count);
                        let image_bytes = null;
                        for(let attr of attrs) {
                            if ( ['thumbnailphoto', 'jpegphoto', 'photo'].indexOf(attr.toLowerCase()) >= 0 ) {
                                if ( !image_bytes && !this.callbackData.validImage ) {
                                    let values = pMsg.getBinaryValues(attr, count); //[xpconnect wrapped nsILDAPBERValue]
                                    if (values && values.length > 0 && values[0]) {
                                        image_bytes = values[0].get(count);
                                    }
                                }
                            } else {
                                if ( typeof (this.callbackData.ldap) == 'undefined' ) this.callbackData.ldap = {};
                                this.callbackData.ldap[attr] = pMsg.getValues(attr, count);
                            }
                        }
                        if (image_bytes && image_bytes.length > 2) {
                            let encImg = this.callbackData.win.btoa(String.fromCharCode.apply(null, image_bytes));
                            this.callbackData.src = "data:image/jpeg;base64," + encImg;
                            this.callbackData.validImage = true;
                        }
                        this.callbackData.ldap['_dn'] = [pMsg.dn];
                        this.callbackData.ldap['_Status'] = ['Query Successful'];
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
                    default:
                        ldapInfoLog.log('operation done ' + pMsg.type );
                        this.connection = null;
                        if ( typeof(this.callbackData.ldap['_Status']) == 'undefined' ) {
                          this.callbackData.ldap['_dn'] = [this.callbackData.address];
                          this.callbackData.ldap['_Status'] = ['No Match'];
                        }
                        ldapInfoFetch.callBackAndRunNext(this.callbackData);
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
        try {
            ldapInfoLog.log("ldapInfoFetch cleanup");
            this.clearCache();
            if ( this.queue.length >= 1 && typeof(this.queue[0][0]) != 'undefined' ) {
                let callbackData = this.queue[0][0];
                if ( typeof(callbackData.ldapOp) != 'undefined' ) {
                    callbackData.ldapOp.abandonExt();
                    ldapInfoLog.log("ldapInfoFetch abandonExt");
                }
                if ( typeof(callbackData.win) != 'undefined' && typeof(callbackData.timer) != 'undefined' ) {
                    ldapInfoLog.log('clearTimeout');
                    callbackData.win.clearTimeout(callbackData.timer);
                }
            }
            this.queue = [];
            Cu.unload("chrome://ldapInfo/content/log.jsm");
        } catch (err) {
            ldapInfoLog.logException(err);
        }
        this.currentAddress = ldapInfoLog = null;
    },
    
    callBackAndRunNext: function(callbackData) {
        ldapInfoLog.log('callBackAndRunNext, now is ' + callbackData.address);
        if ( typeof(callbackData.ldapOp) != 'undefined' ) {
            ldapInfoFetch.lastTime = Date.now();
            if ( typeof(callbackData.win) != 'undefined' && typeof(callbackData.timer) != 'undefined' ) {
                ldapInfoLog.log('clearTimeout');
                callbackData.win.clearTimeout(callbackData.timer);
            }
            delete callbackData.ldapOp;
        }
        ldapInfoFetch.queue = ldapInfoFetch.queue.filter( function (args) { // call all callbacks if for the same address
            let cbd = args[0];
            ldapInfoLog.log('callBackAndRunNext, loop for ' + cbd.address);
            if ( cbd.address != callbackData.address ) return true;
            try {
                if ( !( cbd === callbackData ) ) {
                    if ( typeof(callbackData.src) != 'undefined' ) cbd.src = callbackData.src;
                    cbd.validImage = callbackData.validImage;
                    for ( let i in callbackData.ldap ) {
                        cbd.ldap[i] = callbackData.ldap[i];
                    }
                }
                cbd.image.classList.remove('ldapInfoLoading');
                //cbd.image.classList.remove('ldapInfoLoadingQueue');
                cbd.callback(cbd);
            } catch (err) {
                ldapInfoLog.logException(err);
            }
            return false;
        });
        ldapInfoLog.logObject(ldapInfoFetch.queue,'after queue',0);
        if (ldapInfoFetch.queue.length >= 1) {
            ldapInfoLog.log('RunNext');
            this._fetchLDAPInfo.apply(ldapInfoFetch, ldapInfoFetch.queue[0]);
        }
        ldapInfoLog.log('callBackAndRunNext done');
    },
    
    queueFetchLDAPInfo: function(...theArgs) {
        ldapInfoLog.log('queueFetchLDAPInfo');
        this.queue.push(theArgs);
        let callbackData = theArgs[0];
        if (this.queue.length === 1) {
            ldapInfoLog.log('first');
            this._fetchLDAPInfo.apply(this, theArgs);
        } else {
            let className = 'ldapInfoLoadingQueue';
            if ( callbackData.address == this.currentAddress ) className = 'ldapInfoLoading';
            callbackData.image.classList.add(className);
            ldapInfoLog.logObject(this.queue,'new queue',0);
        }
    },

    _fetchLDAPInfo: function (callbackData, host, prePath, basedn, binddn, filter, attribs) {
        try {
            let password = null;
            this.currentAddress = callbackData.address;
            this.queue.forEach( function(args) {
                if ( args[0].address == ldapInfoFetch.currentAddress ) {
                    args[0].image.classList.remove('ldapInfoLoadingQueue');
                    args[0].image.classList.add('ldapInfoLoading');
                }
            } );
            // ldap://directory.foo.com/o=foo.com??sub?(objectclass=*)
            let urlSpec = prePath + '/' + basedn + "?" + attribs + "?sub?" +  filter;
            if ( typeof(binddn) == 'string' && binddn != '' ) {
                password = this.getPasswordForServer(prePath, host, binddn, false, urlSpec);
                if (password == "") password = null;
                else if (!password) {
                    callbackData.ldap['_Status'] = ['No Password'];
                    this.callBackAndRunNext(callbackData);
                }
            }
            let ldapconnection = this.ldapConnections[basedn];
            // if idle too long, might get disconnected and later we won't get notified
            if ( ldapconnection && ( Date.now() - this.lastTime ) >= 60 * 5 * 1000 ) {
                ldapInfoLog.log("invalidate cached connection");
                ldapconnection = null;
                delete this.ldapConnections[basedn];
            }
            if (ldapconnection) {
                ldapInfoLog.log("use cached connection");
                try {
                    let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs);
                    ldapInfoLog.log("startSearch");
                    connectionListener.startSearch(true);
                    return; // listener will run next
                } catch (err) {
                    ldapInfoLog.log("cached issue " + ldapconnection.errorString);
                    ldapInfoLog.logException(err);
                    this.clearCache();
                }
            }
            ldapInfoLog.log("create new connection");
            ldapconnection = Cc["@mozilla.org/network/ldap-connection;1"].createInstance().QueryInterface(Ci.nsILDAPConnection);
            let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs);
            let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
            ldapconnection.init(url, binddn, connectionListener, /*nsISupports aClosure*/null, ldapconnection.VERSION3);
        } catch (err) {
            ldapInfoLog.logException(err);
            //callbackData.ldap['_filter'] = [filter];
            callbackData.ldap['_Status'] = ['Exception'];
            this.callBackAndRunNext(callbackData); // with failure
        }
    }
}