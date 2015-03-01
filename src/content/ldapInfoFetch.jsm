// copy from ldap_contact_photo https://addons.mozilla.org/en-US/thunderbird/addon/ldap-contact-photo/ by Piotr Piastucki
// license: MPL
// Modified by Opera Wang to enable queue and timeout etc.

"use strict";
var EXPORTED_SYMBOLS = ["ldapInfoFetch"];
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("chrome://ldapInfo/content/log.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoUtil.jsm");
Cu.import("chrome://ldapInfo/content/sprintf.jsm");
Cu.import("chrome://ldapInfo/content/ldapInfoLoadRemoteBase.jsm");

let ldapInfoFetch =  {
    ldapConnections: {}, // {dn : connection}, should I use nsILDAPService?
    queue: [], // request queue
    lastTime: Date.now(), // last connection use time
    currentAddress: null,
    timer: null, // for timeout
    fetchTimer: null, // for async call next
    batchCacheLDAP: {}, // email => {cache: cb.cache, filter: {}}
    temp_disable_batch: 0, // if eq ldapInfoUtil.options.ldap_batch, then disable batch query

    photoLDAPMessageListener: function (callbackData, connection, bindPassword, dn, scope, filter, attributes, uuid) {
        this.callbackData = callbackData;
        this.connection = connection;
        this.bindPassword = bindPassword;
        this.dn = dn;
        this.scope = scope;
        this.filter = filter;
        this.attributes = attributes;
        this.uuid = uuid;
        this.sizeLimit = 1;
        this.sizeCount = 1;
        this.addtionalAttributes = [];
        this.valid = true; // when timeout, or enough entries was received , set to false
        this.mails = this.callbackData.address;
        this.QueryInterface = XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsILDAPMessageListener]);
        
        this.onLDAPInit = function(pConn, pStatus) {
            let fail = "";
            try {
                ldapInfoLog.info("onLDAPInit");
                if ( pStatus === Cr.NS_OK ) {
                    let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                    this.callbackData.ldapOp = ldapOp;
                    ldapOp.init(pConn, this, null);
                    ldapInfoLog.info("simpleBind");
                    ldapOp.simpleBind(this.bindPassword); // when connection reset, simpleBind still need 1 seconds to exception
                    ldapInfoLog.info("simpleBind OK");
                    return;
                }
                fail = '0x' + pStatus.toString(16) + ": " + ldapInfoUtil.getErrorMsg(pStatus);
            } catch (err) {
                ldapInfoLog.logException(err, false);
                fail = "exception!";
                if ( err.result ) fail += " " + ldapInfoUtil.getErrorMsg(err.result);
            }
            ldapInfoLog.info("onLDAPInit failed with " + fail);
            this.connection = null;
            this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
            this.callbackData.cache.ldap['_Status'] = ["LDAP " + fail];
            ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
        };
        this.startSearch = function(cached) {
            try {
                let ldapOp = Cc["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Ci.nsILDAPOperation);
                this.callbackData.ldapOp = ldapOp;
                ldapOp.init(this.connection, this, null);
                let useFilter = this.filter;
                let filters = [];
                let self = this;
                let attributes = this.attributes.split(',');
                let lowerCaseAttributes = attributes.map( function(str) { return str.toLowerCase(); } );
                ldapInfoFetch.batchCacheLDAP = {};
                ldapInfoFetch.queue.every( function (args) {
                    if ( args[8] == self.uuid && args[2] == self.dn && !ldapInfoFetch.batchCacheLDAP[args[0].address] && args[0].cache.ldap.state != ldapInfoUtil.STATE_DONE ) {
                        let cb = args[0];
                        let f = args[4];
                        f = ( f.startsWith('(') && f.endsWith(')') ) ? f : '(' + f + ')'
                        if ( filters.indexOf(f) < 0 ) filters.push(f);
                        ldapInfoFetch.batchCacheLDAP[cb.address] = {cache: cb.cache, filter: {}, fallback: {}};
                        ldapInfoFetch.batchCacheLDAP[cb.address].filter['_basedn_'] = self.dn.toLowerCase(); // use batchCacheLDAP[cb.address].filter to distinguish results entries to different addresses
                        // (|(mail=foo@bar)(mailLocalAddress=foo@bar.com)(uid=foo))
                        // (&(mail=foo)(ou=People)), ou=People will be ignored for scores
                        f.split(/[^\w=@.\-:~<>*!]+/).forEach( function(str) {
                            let index;
                            if ( str != '' && ( index = str.indexOf('=') ) ) {
                                let name = str.substr(0, index); // mailLocalAddress
                                let value = str.substr(index+1).toLowerCase(); // foo@bar
                                if ( name && value && cb.address.indexOf(value) >= 0 && value.indexOf(cb.mailid) >= 0 ) { // value must be part of address, and mailid must be part of value
                                    if ( attributes.length > 0 && lowerCaseAttributes.indexOf(name.toLowerCase()) < 0 ) {
                                        attributes.push(name); // uid, jepgPhoto, ...
                                        lowerCaseAttributes.push(name.toLowerCase());
                                        self.addtionalAttributes.push(name);
                                    }
                                    ldapInfoFetch.batchCacheLDAP[cb.address].filter[name] = value; // { mail: foo@bar }
                                }
                            }
                        });
                        return filters.length < ldapInfoUtil.options.ldap_batch && ldapInfoFetch.temp_disable_batch != ldapInfoUtil.options.ldap_batch;
                    }
                } );
                if ( filters.length > 1 ) useFilter = '(|' + filters.join('') + ')';
                this.sizeCount = this.sizeLimit = Object.keys(ldapInfoFetch.batchCacheLDAP).length;
                this.mails = Object.keys(ldapInfoFetch.batchCacheLDAP).join(', ') || this.mails;
                
                let timeout = ldapInfoUtil.options['ldapTimeoutInitial'];
                if ( cached ) timeout = ldapInfoUtil.options['ldapTimeoutWhenCached'];
                ldapInfoLog.info("startSearch dn:" + this.dn + " filter:" + useFilter + " scope:" + this.scope + " attributes:" + attributes.join(',') );
                ldapOp.searchExt(this.dn, this.scope, useFilter, attributes.join(','), /*aTimeOut, not implemented yet*/(timeout-1)*1000, /*aSizeLimit*/this.sizeLimit);
                ldapInfoFetch.lastTime = Date.now();
                if ( !ldapInfoFetch.timer ) ldapInfoFetch.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
                this.timerFunc = function(event) {
                    ldapInfoLog.log("ldapInfoShow searchExt timeout " + ( event.delay/1000 ) + " seconds reached", 1);
                    // can't async call abandonExt here, may cause strange issue for RES_SEARCH_ENTRY
                    // try { ldapOp.abandonExt(); } catch (err) {};
                    self.valid = false;
                    ldapInfoFetch.clearCache();
                    ldapInfoFetch.callBackAndRunNext({address: 'retry', ldapOp: ldapOp}); // retry current search
                };
                ldapInfoFetch.timer.initWithCallback( this.timerFunc, timeout * 1000, Ci.nsITimer.TYPE_ONE_SHOT );
            }  catch (err) {
                ldapInfoLog.info("search issue");
                ldapInfoLog.logException(err);
                this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                this.callbackData.cache.ldap['_Status'] = ["LDAP startSearch Fail"];
                ldapInfoFetch.clearCache();
                ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
            }
        };
        this.onLDAPMessage = function(pMsg) {
            try {
                ldapInfoLog.info('get msg for ' + this.mails + ' with type 0x' + pMsg.type.toString(16) );
                if ( pMsg.errorCode != Ci.nsILDAPErrors.SUCCESS )ldapInfoLog.info('error: ' + ldapInfoUtil.getErrorMsg(0x80590000+pMsg.errorCode) );
                switch (pMsg.type) {
                    case Ci.nsILDAPMessage.RES_BIND :
                        if ( pMsg.errorCode == Ci.nsILDAPErrors.SUCCESS ) {
                            ldapInfoFetch.ldapConnections[this.dn] = this.connection;
                            this.startSearch(false);
                        } else {
                            try {
                                pMsg.operation.abandonExt();
                            } catch (err) {};
                            this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                            // http://dxr.mozilla.org/mozilla-central/source/xpcom/base/nsError.h
                            this.callbackData.cache.ldap['_Status'] = ['LDAP Bind Error 0x805900' + pMsg.errorCode.toString(16) + " " + ldapInfoUtil.getErrorMsg(0x80590000+pMsg.errorCode)];
                            ldapInfoLog.log('ldapInfoShow ' + this.callbackData.cache.ldap['_Status'], 1);
                            this.connection = null;
                            ldapInfoFetch.callBackAndRunNext(this.callbackData); // with failure
                        }
                        break;
                    case Ci.nsILDAPMessage.RES_SEARCH_ENTRY :
                        // TODO: one entry can be for multiple search, eg both weiw & opera.wang can get one entry
                        ldapInfoFetch.timer.initWithCallback( this.timerFunc, ldapInfoFetch.timer.delay, Ci.nsITimer.TYPE_ONE_SHOT );
                        let count = {};
                        let attrs = pMsg.getAttributes(count); // count.value is number of attributes
                        let lowerCaseAttrs = attrs.map( function(str) { return str.toLowerCase(); } ); // ["cn", "jpegphoto", "mail", ...]
                        /* for batch operation, only support to search uid & full address
                           if filter template is (|(mail=%(email)s)(mailLocalAddress=%(email)s)(uid=%(mailid)s))
                           then check mail, mailLocalAddress & uid of current pMsg, if the value contains our value, then use the address
                           we use scores to first find best match, and at last if one address has no match entry, will check it's score and use mapping
                        */
                        let scores = {};
                        for ( let address in ldapInfoFetch.batchCacheLDAP ) {
                            scores[address] = 0;
                            let filter = ldapInfoFetch.batchCacheLDAP[address].filter; // {__basedn_: 'o=company.com', mail: weiw@company.com, mailLocalAddress: weiw@company.com }
                            // pMsg.dn == 'uid=weiw, ou=People, o=company.com'
                            if ( filter['_basedn_'] == pMsg.dn.toLowerCase() ) scores[address] += 10000;
                            for(let f in filter) { // values are lowercase, keys maybe not
                                if ( f == '_basedn_' ) continue;
                                let index = lowerCaseAttrs.indexOf(f.toLowerCase());
                                if ( index >= 0 ) {
                                    let values = pMsg.getValues(attrs[index], count).map( function(str) { return str.toLowerCase(); } ); // ['weiw@company.com', 'opera.wang@company.com']
                                    if ( values.indexOf(filter[f]) >= 0 ) {
                                        scores[address] ++;
                                    }
                                }
                            }
                        }
                        let score = 0; let email; let OK = true;
                        for ( let address in scores ) {
                            if ( scores[address] > score ) {
                                email = address;
                                score = scores[address];
                            }
                        }
                        if ( score == 0 && this.sizeLimit == 1) {
                            email = this.callbackData.address;
                            score = 1;
                        }
                        for ( let address in scores ) {
                            if ( scores[address] > 0 ) { // can be used as fall-back choice
                                ldapInfoFetch.batchCacheLDAP[address].fallback[email] = scores[address];
                            }
                        }
                        if ( score == 0 ) {
                            ldapInfoLog.log("Can't find address for LDAP search result, Temp disable batch query for LDAP", "Error");
                            ldapInfoFetch.temp_disable_batch = ldapInfoUtil.options.ldap_batch;
                            OK = false;
                        }
                        if (OK) {
                            let image_bytes = null;
                            let cache = ldapInfoFetch.batchCacheLDAP[email].cache;
                            for(let attr of attrs) {
                                if ( ['thumbnailphoto', 'jpegphoto', 'photo'].indexOf(attr.toLowerCase()) >= 0 ) {
                                    if ( !image_bytes ) {
                                        let values = pMsg.getBinaryValues(attr, count); //[xpconnect wrapped nsILDAPBERValue]
                                        if (values && values.length > 0 && values[0]) {
                                            image_bytes = values[0].get(count);
                                        }
                                    }
                                } else {
                                    if ( this.addtionalAttributes.indexOf(attr) < 0 ) cache.ldap[attr] = pMsg.getValues(attr, count);
                                }
                            }
                            if (image_bytes && image_bytes.length > 2) {
                                let win = this.callbackData.win.get();
                                if ( win && win.btoa ) {
                                    cache.ldap.src = "data:image/jpeg;base64," + ldapInfoUtil.byteArray2Base64(win, image_bytes);
                                }
                            }
                            cache.ldap['_dn'] = [pMsg.dn];
                            // cache.ldap.state = ldapInfoUtil.STATE_DONE; set here will have no sprintf
                            cache.ldap['_Status'] = ['LDAP ' + ldapInfoUtil.CHAR_HAVEPIC];
                            this.sizeCount --;
                            if ( cache.ldap.src ) ldapInfoFetch.PreCallBack(email);
                        }
                        ldapInfoLog.info("remain " + this.sizeCount + " of " +Object.keys(ldapInfoFetch.batchCacheLDAP).length);
                        if ( this.sizeCount && OK ) break; // we now get enough data, and may need quite a while (and maybe timeout) for get the next message, so we don't break here and just callnext
                    case Ci.nsILDAPMessage.RES_SEARCH_RESULT :
                    default:
                        this.connection = null;
                        if ( !this.valid ) break; // sometime you may still get RES_SEARCH_RESULT even you got enough entries and call abandonExt, the msg may even belongs to previous request as new one is already fired.
                        else this.valid = false;
                        //this.callbackData.cache.ldap.state = ldapInfoUtil.STATE_DONE; // finished, will be set in callBackAndRunNext
                        ldapInfoFetch.callBackAndRunNext(this.callbackData);
                        break;
                }
            } catch (err) {
                ldapInfoLog.logException(err);
            }
        };
    },

    clearCache: function () {
        ldapInfoLog.info("clear ldapConnections");
        this.ldapConnections = {};
    },
    
    cleanup: function() {
        try {
            ldapInfoLog.info("ldapInfoFetch cleanup");
            this.clearCache();
            if ( this.timer ) this.timer.cancel();
            if ( this.fetchTimer ) this.fetchTimer.cancel();
            if ( this.queue.length >= 1 && typeof(this.queue[0][0]) != 'undefined' ) {
                let callbackData = this.queue[0][0];
                if ( typeof(callbackData.ldapOp) != 'undefined' ) {
                    try {
                        ldapInfoLog.info("ldapInfoFetch abandonExt");
                        callbackData.ldapOp.abandonExt();
                    } catch (err) {};
                }
            }
            this.queue = [];
            this.batchCacheLDAP = {};
        } catch (err) {
            ldapInfoLog.logException(err);
        }
        ldapInfoLog.info("ldapInfoFetch cleanup done");
        this.currentAddress = this.timer = this.fetchTimer = ldapInfoLog = ldapInfoUtil = ldapInfoSprintf = null;
    },
    
    PreCallBack: function(address) { // this is only usefull for those have jpegPhoto, not for those need do sprintf
        ldapInfoLog.info("PreCallBack " + address);
        this.queue.forEach( function (args) {
            if ( args[0].address == address ) args[0].callback(args[0]);
        });
    },
    
    finishState: function(cbd) {
        cbd.cache.ldap.state = ldapInfoUtil.STATE_DONE;
        if ( typeof(cbd.cache.ldap['_Status']) == 'undefined' ) {
            // can we try fallback?
            let fallbacks = Object.keys(this.batchCacheLDAP[cbd.address].fallback);
            if ( fallbacks.length == 1 ) { // can only fallback to one email
              cbd.cache.ldap = this.batchCacheLDAP[fallbacks[0]].cache.ldap;
              ldapInfoLog.info("LDAP:" + cbd.address + " is same as " + fallbacks[0]);
            }
        }
        if ( typeof(cbd.cache.ldap['_Status']) == 'undefined' ) {
            ldapInfoLog.info("No Match for " + cbd.address, "Not Match");
            cbd.cache.ldap['_dn'] = [cbd.address];
            cbd.cache.ldap['_Status'] = ['LDAP ' + ldapInfoUtil.CHAR_NOUSER];
        } else if ( ldapInfoUtil.options.load_from_photo_url && !cbd.cache.ldap.src ) {
            try {
                cbd.cache.ldap.src = ldapInfoSprintf.sprintf( ldapInfoUtil.options['photoURL'], cbd.cache.ldap );
            } catch ( err ) {
                cbd.cache.ldap['_Status'] = ['LDAP ' + ldapInfoUtil.CHAR_NOPIC];
                ldapInfoLog.info('photoURL format error: ' + err);
            }
        }
    },
    
    callBackAndRunNext: function(callbackData) {
        ldapInfoLog.info('callBackAndRunNext, now is ' + callbackData.address);
        //ldapInfoLog.logObject(this.queue.map( function(one) {
        //    return one[5];
        //} ), 'before filter queue', 0);
        if ( this.timer ) this.timer.cancel();
        if ( callbackData.ldapOp ) {
            try {
                callbackData.ldapOp.abandonExt(); // abandon the RES_SEARCH_RESULT message for successfull query
            } catch (err) {};
            this.lastTime = Date.now();
            delete callbackData.ldapOp;
        }

        let removed = false; // to prevent fetch the same twice and hang TB
        let retry = ( callbackData.address == 'retry' );
        if ( retry || callbackData.cache.ldap.state == ldapInfoUtil.STATE_TEMP_ERROR ) this.batchCacheLDAP = {};
        
        // for each one have _dn || !retry
        if ( !retry && callbackData.cache.ldap.state <= ldapInfoUtil.STATE_QUERYING ) this.finishState(callbackData);
        if ( retry ) this.queue.forEach( function(args) {
            let cbd = args[0];
            if ( cbd.cache.ldap['_dn'] && cbd.cache.ldap.state <= ldapInfoUtil.STATE_QUERYING ) ldapInfoFetch.finishState(cbd);
        } );

        let callFetch = function () {
            ldapInfoLog.info('callFetch, now is ' + callbackData.address);
            self.queue = self.queue.filter( function (args) { // call all callbacks if for the same address
                let cbd = args[0];
                if ( cbd.address != callbackData.address ) return true;
                try {
                    cbd.image.classList.remove('ldapInfoLoading');
                    cbd.callback(cbd);
                } catch (err) {
                    ldapInfoLog.logException(err);
                }
                removed = true;
                return false;
            });

            if ( self.queue.length >= 1 ) {
                if ( removed || retry ) {
                    if ( Object.keys(self.batchCacheLDAP).length > 1 ) { // batch mode, call directly
                        self._fetchLDAPInfo.apply(self, self.queue[0]);
                    } else {
                        self.fetchTimer.initWithCallback( function() { // can be function, or nsITimerCallback
                            ldapInfoFetch._fetchLDAPInfo.apply(ldapInfoFetch, ldapInfoFetch.queue[0]);
                        }, 0, Ci.nsITimer.TYPE_ONE_SHOT );
                    }
                }
            } else {
                self.batchCacheLDAP = {};
            }
        };
        let intranetURL;
        if ( ldapInfoUtil.options.load_from_intranet && callbackData.cache.ldap.state > ldapInfoUtil.STATE_QUERYING && callbackData.cache.ldap._Status
        && !callbackData.cache.ldap._Status[0].endsWith(ldapInfoUtil.CHAR_NOUSER) && [ldapInfoUtil.STATE_INIT, ldapInfoUtil.STATE_TEMP_ERROR].indexOf(callbackData.cache.intranet.state) >= 0 ) {
            try {
                intranetURL = ldapInfoSprintf.sprintf( ldapInfoUtil.options.intranetTemplate, { basic: callbackData, ldap: callbackData.cache.ldap } );
                callbackData.cache.intranet.state = ldapInfoUtil.STATE_QUERYING;
            } catch (err) {
                callbackData.cache.intranet.state = ( callbackData.cache.ldap.state == ldapInfoUtil.STATE_TEMP_ERROR ) ? ldapInfoUtil.STATE_TEMP_ERROR : ldapInfoUtil.STATE_ERROR;
                callbackData.cache.intranet['_Status'] = ['Intranet ' + err + ' ' + ldapInfoUtil.CHAR_NOUSER];
            }
        }
        if (intranetURL) {
            let remoteRequest = new ldapInfoLoadRemoteBase(callbackData, 'Intranet', 'intranet', intranetURL, callFetch);
            return remoteRequest.makeRequest();
        } else callFetch();
    },
    
    queueFetchLDAPInfo: function(...theArgs) {
        if ( !this.fetchTimer ) this.fetchTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        this.queue.push(theArgs);
        let callbackData = theArgs[0];
        ldapInfoLog.info('queueFetchLDAPInfo ' + callbackData.address);
        if (this.queue.length === 1) {
            ldapInfoLog.info('first');
            this.fetchTimer.initWithCallback( function() { // can be function, or nsITimerCallback
                ldapInfoFetch._fetchLDAPInfo.apply(ldapInfoFetch, theArgs);
            }, 0, Ci.nsITimer.TYPE_ONE_SHOT );
        } else {
            let className = 'ldapInfoLoadingQueue';
            if ( callbackData.address == this.currentAddress ) className = 'ldapInfoLoading';
            callbackData.image.classList.add(className);
        }
    },

    _fetchLDAPInfo: function (callbackData, prePath, basedn, binddn, filter, attribs, scope, original_spec, uuid) {
        try {
            let password = null;
            this.currentAddress = callbackData.address;
            this.queue.forEach( function(args) {
                if ( args[0].address == ldapInfoFetch.currentAddress ) {
                    args[0].image.classList.remove('ldapInfoLoadingQueue');
                    args[0].image.classList.add('ldapInfoLoading');
                }
            } );

            if ( this.batchCacheLDAP[this.currentAddress] || callbackData.cache.ldap.state == ldapInfoUtil.STATE_DONE ) return this.callBackAndRunNext(callbackData);
            
            if ( typeof(binddn) == 'string' && binddn != '' ) {
                password = ldapInfoUtil.getPasswordForServer(prePath, binddn, false, original_spec);
                if (password == "") password = null;
                else if (!password) {
                    callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                    callbackData.cache.ldap['_Status'] = ['LDAP No Password'];
                    this.callBackAndRunNext(callbackData);
                }
            }
            if ( Services.io.offline ) {
                ldapInfoLog.info("offline mode");
                callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
                callbackData.cache.ldap['_Status'] = ['LDAP Offline'];
                return this.callBackAndRunNext(callbackData); // with failure
            }
            let ldapconnection = this.ldapConnections[basedn];
            // if idle too long, might get disconnected and later we won't get notified
            if ( ldapconnection && ( Date.now() - this.lastTime ) >= ldapInfoUtil.options.ldapIdleTimeout * 1000 ) {
                ldapInfoLog.info("invalidate cached connection");
                ldapconnection = null;
                delete this.ldapConnections[basedn];
            }
            if (ldapconnection) {
                ldapInfoLog.info("use cached connection");
                try {
                    let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, scope, filter, attribs, uuid);
                    connectionListener.startSearch(true);
                    return; // listener will run next
                } catch (err) {
                    ldapInfoLog.info("cached issue " + ldapconnection.errorString);
                    ldapInfoLog.logException(err);
                    this.clearCache();
                }
            }
            ldapInfoLog.info("create new connection");
            ldapconnection = Cc["@mozilla.org/network/ldap-connection;1"].createInstance().QueryInterface(Ci.nsILDAPConnection);
            let connectionListener = new this.photoLDAPMessageListener(callbackData, ldapconnection, password, basedn, scope, filter, attribs, uuid);
            // ldap://directory.foo.com/o=foo.com??sub?(objectclass=*)
            let urlSpec = prePath + '/' + basedn + "?" + attribs + "?sub?" +  filter;
            let url = Services.io.newURI(urlSpec, null, null).QueryInterface(Ci.nsILDAPURL);
            ldapconnection.init(url, binddn, connectionListener, /*nsISupports aClosure*/null, ldapconnection.VERSION3);
        } catch (err) {
            ldapInfoLog.logException(err);
            callbackData.cache.ldap.state = ldapInfoUtil.STATE_TEMP_ERROR;
            callbackData.cache.ldap['_Status'] = ['LDAP Exception'];
            this.callBackAndRunNext(callbackData); // with failure
        }
    }
}
let self = ldapInfoFetch;