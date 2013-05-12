// copy from ldap_contact_photo https://addons.mozilla.org/en-US/thunderbird/addon/ldap-contact-photo/ by Piotr Piastucki
// license: MPL

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetch"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");

let Application = null;
try {
  Application = Cc["@mozilla.org/steel/application;1"].getService(Ci.steelIApplication); // Thunderbird
} catch (e) {}

let ldapInfoFetch =  {

    getPasswordForServer: function (serverUrl, hostName, login, force, realm) {
        let passwordManager = Services.logins;
        if (passwordManager) {
            
            let password = { value: "" };
            let check = { value: false };
            var oldLoginInfo;
            try {    
                var logins = passwordManager.findLogins({}, serverUrl, null, realm);            
                var foundCredentials = false;
                for (var i = 0; i < logins.length; i++) {
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
            var strBundle = Services.strings.createBundle('chrome://mozldap/locale/ldap.properties');
            var strBundle2 = Services.strings.createBundle('chrome://passwordmgr/locale/passwordmgr.properties');

            var prompts = Services.prompt;
            var okorcancel = prompts.promptPassword(null, strBundle.GetStringFromName("authPromptTitle"), 
                                strBundle.formatStringFromName("authPromptText", [hostName + " photo"], 1),
                                password, 
                                strBundle2.GetStringFromName("rememberPassword"),
                                check);
            if(!okorcancel) {
                return;
            }
            if(check.value) {
                var nsLoginInfo = new Cc("@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");     
                var loginInfo = new nsLoginInfo(serverUrl, null, realm, "", password.value,"", "");
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
            try {
                var ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                ldapOp.init(this.connection, this, null);
                ldapOp.simpleBind(this.bindPassword);
            } catch (err) {
                ldapInfoLog.logException(err);
                this.callback(); // with failure
            }
        };
        this.startSearch = function() {
            var ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
            ldapOp.init(this.connection, this, null);
            ldapOp.searchExt(this.dn, this.scope, this.filter, this.attributes, /*aTimeOut*/3, /*aSizeLimit*/1);
        };
        this.onLDAPMessage = function(pMsg) {
            try {
                switch (pMsg.type) {
                    case Ci.nsILDAPMessage.RES_BIND :
                        var success = pMsg.errorCode == Ci.nsILDAPErrors.SUCCESS;
                        if (success) {
                            let connections =  Application.storage.get("ldapInfoFetchConnections", []);
                            connections[this.dn] = this.connection;
                            Application.storage.set("ldapInfoFetchConnections", connections);
                            this.startSearch();
                        }
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_ENTRY :
                        let count = new Object();
                        let attrs = pMsg.getAttributes(count);
                        let image_bytes = null;
                        for(let attr of attrs) {
                            if (attr.toLowerCase() == "thumbnailphoto" || (attr.toLowerCase() == "jpegphoto" )) {
                                if (!image_bytes) {
                                    let values = pMsg.getBinaryValues(attr, count); //[xpconnect wrapped nsILDAPBERValue]
                                    if (values && values.length > 0 && values[0]) {
                                        image_bytes = values[0].get(count);
                                    }
                                }
                            } else {
                                if ( typeof (aImg.ldap) == 'undefined' ) aImg.ldap = {};
                                aImg.ldap[attr] = pMsg.getValues(attr, count)[0];
                            }
                        }
                        if (image_bytes && image_bytes.length > 2) {
                            var encImg = aImg.ownerDocument.defaultView.window.btoa(String.fromCharCode.apply(null, image_bytes));
                            aImg.src = "data:image/jpeg;base64," + encImg;
                            // var cache = Application.storage.get("ldapInfoFetchCache", []);
                        }
                        aImg.ldap['_dn'] = pMsg.dn;
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
                        this.callback();
                        break;
                }
            } catch (err) {
                ldapInfoLog.logException(err);
            }
        };
    },

    clearCache: function () {
        Application.storage.set("ldapInfoFetchConnections", []);
        // Application.storage.set("ldapInfoFetchCache", []);
    },

    fetchLDAPInfo: function (host, basedn, binddn, filter, attribs, aImg, callback) {
        if ( !aImg || !Application || !Application.storage ) return;
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
            let connections = Application.storage.get("ldapInfoFetchConnections", []);
            let ldapconnection = connections[basedn];
            if (ldapconnection) {
                let connectionListener = new ldapInfoFetch.photoLDAPMessageListener(aImg, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs, callback);
                try {
                    connectionListener.startSearch();
                    return;
                } catch (e) {
                    this.clearCache();
                }
            }
            ldapconnection = Cc["@mozilla.org/network/ldap-connection;1"].createInstance().QueryInterface(Ci.nsILDAPConnection);
            let connectionListener = new ldapInfoFetch.photoLDAPMessageListener(aImg, ldapconnection, password, basedn, Ci.nsILDAPURL.SCOPE_SUBTREE, filter, attribs, callback);
            let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
            ldapInfoLog.log("init ldapconnection");
            ldapconnection.init(url, binddn, connectionListener, null, ldapconnection.VERSION3);
        } catch (err) {
            ldapInfoLog.logException(err);
            this.callback(); // with failure
        }
    }
}