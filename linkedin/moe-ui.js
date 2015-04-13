/* LinkedIn javascript API should be loaded by this time */

MOE.UI = {
    
    __of : "hidden",
    
    PeopleBand : function(renderCallback, selectedIndexChanged) {
        if (typeof renderCallback === "undefined") {
            throw "No render callback provided!";
        }
        
        var __contacts = [];
        var __selectedIndex = -1;
        var __maxVisibleCtts = 10;
        var __renderCallback = renderCallback;
        var __selectedIndexChanged = selectedIndexChanged;
        var __itemSize = 30;
        var __currentPage = 0;
        
        var __setPointerNormal = function() {
            $("#in-peopleband-pointer").attr("class", "in-peopleband-pointer-normal");
        };
        
        var __setPointerOFlow = function() {
            $("#in-peopleband-pointer").attr("class", "in-peopleband-pointer-oflow");
        };
        
        var __drawSelected = function(index) {
            if (__selectedIndex > -1) {
                $("#in-contact-"+__selectedIndex).removeClass("toolband-item-container-item-selected");
                $("#in-contact-"+index).addClass("toolband-item-container-item-selected");
            } else if (index === 0) {
                $("#in-contact-"+index).addClass("toolband-item-container-item-selected");
            }
        }
        		
		this.getDisplayableItemsCount = function() {
			var height = window.innerHeight, count = Math.floor((height / __itemSize) - 4);
			return count;
		};
        
        this.empty = function() {
            __contacts = new Array();
            $("#in-peopleband ul").empty();
        };

        this.addContact = function(contact) {
            __contacts.push(contact);
            if (this.getDisplayableItemsCount() < __contacts.length) {
                $("#toolband-nav-controls").show();
            }
        };
        
        this.getContact = function(index) {
            return __contacts[index];
        };
		
		this.getContacts = function() {
			return __contacts;
		};
        
        this.updateContact = function(index, updateCallback) {
            if (typeof updateCallback !== "undefined") {
                updateCallback(index, __contacts[index].profile());
            }
        };

        this.updateIndex = function(index) {
			var len = this.getDisplayableItemsCount(), base = __currentPage * len;
			if (index >= base && index < base + len) {
				__renderCallback(index, __contacts[index]);
				if (__selectedIndex === index) {
					__drawSelected(index);
				}
			}
        };

        this.update = function() {
			$("#toolband-item-container").empty();
			var len = this.getDisplayableItemsCount(), base = __currentPage * len;
            for (var ix = 0; ix < len && base < __contacts.length; ix++, base++) {
				__renderCallback(base, __contacts[base]);
				if (__selectedIndex === base) {
					__drawSelected(base);
				}
            }
        };
		
		this.nextPage = function() {
			var len = this.getDisplayableItemsCount(), pages = Math.ceil(__contacts.length / len),
			    moved = false;
			if (__currentPage + 1 < pages) {
				__currentPage++;
				moved = true;
				this.update();
			}
			
			if (__currentPage + 1 === pages) {
			    $("#in-peopleband-pointer-next").css("border-left", "6px solid #BBBBBB");
			    $("#in-peopleband-pointer-next").css("cursor", "default");
			} 
			if (__currentPage - 1 === 0 && moved) {
			    $("#in-peopleband-pointer-prev").css("border-right", "6px solid #777777");
			    $("#in-peopleband-pointer-prev").css("cursor", "pointer");
			}
		};
		
		this.prevPage = function() {
		    var len = this.getDisplayableItemsCount(), pages = Math.ceil(__contacts.length / len);
		    
			if (__currentPage - 1 >= 0) {
				__currentPage--;
				this.update();
			}
			
			if (__currentPage - 1 === -1) {
			    $("#in-peopleband-pointer-prev").css("border-right", "6px solid #BBBBBB");
			    $("#in-peopleband-pointer-prev").css("cursor", "default");
			} 
			if (pages > 0) {
			    $("#in-peopleband-pointer-next").css("border-left", "6px solid #777777");
			    $("#in-peopleband-pointer-next").css("cursor", "pointer");
			}
		};
        
        this.selectedContact = function() {
            return __contacts[__selectedIndex];
        };

        /* this method sets the index and executes some stuff */
        this.selectedIndex = function(index) {
			if (typeof index === "undefined") {
				return __selectedIndex;
			}
            
            if (__selectedIndex !== index) {
                __drawSelected(index);
            }  
			
			if (index > __maxVisibleCtts - 1) {
				__setPointerOFlow();
			} else {
				__setPointerNormal();
			}
			
			__selectedIndex = index;
			
			if (typeof __selectedIndexChanged !== "undefined" && __selectedIndexChanged !== null) {
				__selectedIndexChanged(__selectedIndex);
			}
        };
        
        this.initialize = function() {
            var jqPrev = $("#in-peopleband-pointer-prev");
			jqPrev.click({"owner":this}, function(e) {
				e.data.owner.prevPage();
			});
			
			var jqNext = $("#in-peopleband-pointer-next");
			jqNext.click({"owner":this}, function(e) {
				e.data.owner.nextPage();
			});
        }
    },
    
    Tabs : function(handlers) {
        var __handlers = handlers;
        var __currentTab = null;
        
        this.inializeControl = function() {
            $(".in-tab-content").hide();
            
            $(".in-tab-button").unbind('click');
            $(".in-tab-button").click([this], function(evt) {
                var aid = $(this).find("a").first().attr("id");
                evt.data[0].select(aid);
                return false;
            });
        };
        
        this.showTabButtons = function(show) {
            if (show) {
                $(".in-tabs-list").show();
            } else {
                $(".in-tabs-list").hide();
            }
        };
        
        this.showTab = function(show, id) {
            if (show === true) {
                $(id).parent().parent().show();
            } else {
                $(id).parent().parent().hide();
            }
        };
        
        this.select = function(eid, extraData) {            
            var tab = $(".in-tab-button").find("#" + eid).first().parent().parent();
            var ui = $(tab);
            $(".in-tab-button.active").removeClass("active");
            ui.addClass("active");
            
            /* Let user do something when tab gets clicked */
            if ( (typeof __handlers !== "undefined" && __handlers !== null) && (typeof __handlers["click"] === "function") ) {
                __handlers.click(eid, extraData);
            }
            
            var activeTab = ui.find("a").attr("tabId");
            if (__currentTab !== activeTab) {
                if (__currentTab !== null) {
                    $(__currentTab).hide();
                }
                $(activeTab).fadeIn();
                __currentTab = activeTab;
            }
            
            /* Let user do something when tab gets activated */
            if ( (typeof __handlers !== "undefined" && __handlers !== null) && (typeof __handlers["activated"] === "function") ) {
                __handlers.activated(eid, extraData);
            }
        };
        
        (function(me){
            me.inializeControl();
        })(this);
        
    },
    
    Pager : function(info) {
        if (typeof info === "undefined" || info === null) {
            throw "No constructor info!";
        }
            
        var __info = info;
        var __from = __info.step * -1;
        var __to = 0;
        var __diff = 0;
        
        var __updateStatus = function() {
            if (typeof __info !== "undefined" && __info !== null && __info["updateStatus"] !== null) {
                __info.updateStatus(__from, __to, __info.count);
            }
        };
        
        var __updateContent = function() {
            if (typeof __info !== "undefined" && __info !== null && __info["updateContent"] !== null) {
                __info.updateContent(__from, __to, __info.count);
            }
        };
        
        var __updateNavControls = function() {
            if (typeof __info !== "undefined" && __info !== null && __info["updateNavControls"] !== null) {
                __info.updateNavControls(__from, __to, __info.count);
            }
        };
        
        this.movePrev = function() {
            if (__from > 0) {
                __from -= __info.step;
                
                if (__diff === 0) {
                    __to -= __info.step;
                } else {
                    __to -= __diff;
                    __diff = 0;
                }
                __updateStatus();
                __updateContent();
                __updateNavControls();
            } 
        };
        
        this.moveNext = function() {
            if (__info.count > MOE.UI.Renderer.__maxSearchResults) {
                var mdiff = MOE.UI.Renderer.__maxSearchResults - (__to + __info.step), absMdiff = Math.abs(mdiff);
                if (mdiff < 0 && absMdiff > __info.step) return;
                if (absMdiff < __info.step && __to + __info.step > MOE.UI.Renderer.__maxSearchResults + (__info.step - absMdiff)) return;
            }
            
            var changed = false;
            if (__to + __info.step <= __info.count) {
                __from += __info.step;
                __to += __info.step;            
                changed = true;
            } else if (__info.count - __to > 0 && __info.count - __to < __info.step) {
                __diff = __info.count - __to;
                __from += __info.step;            
                __to += __diff;
                changed = true;
            }   
            
            if (changed === true) {
                __updateStatus();
                __updateContent();
                __updateNavControls();
            }
        };
        
        this.update = function() {
            __updateStatus();
            __updateContent();
            __updateNavControls();
        };
    },
    
    Menu : {
        __dropdown : null,
        __tag : {},
        __adjustment : 20, /* this is an adjustment for padding and margin values */

        Disable : function() {
            $("#in-menu").hide();
            $("#in-menu-uopt").css("visibility", "hidden");
        },
        Enable : function() {
            $("#in-menu").show();
            $("#in-menu-uopt").css("visibility", "visible");
        },

        Close : function() {
            if (MOE.UI.Menu.__dropdown !== null) { 
                MOE.UI.Menu.__dropdown.hide();
            }
        },
        Open : function() {
            MOE.UI.Menu.Close();
            var title = $("#in-menu-uopt-title").first(), 
                titleOS = title.offset(),
                titleW = title.width(), 
                titleH = title.height();
            MOE.UI.Menu.__dropdown = $(this).find('ul').first();            
            MOE.UI.Menu.__dropdown.css("left", (titleOS.left + titleW - MOE.UI.Menu.__dropdown.width() + MOE.UI.Menu.__adjustment).toString() + "px");
            MOE.UI.Menu.__dropdown.css("top", (titleOS.top + titleH).toString() + "px");            
            MOE.UI.Menu.__dropdown.show();
        },

        Initialize : function() {
            MOE.IN.Events.On("menuInitialization", function() {
                MOE.IN.Events.Remove("menuInitialization");
                MOE.IN.Cache.OwnProfile(function(ownProfile) {
                    MOE.UI.Menu.Update(ownProfile).Enable();
                    $('#in-menu-uopt > li').mouseover(MOE.UI.Menu.Open);
                    $('#in-menu-uopt > li').mouseout(MOE.UI.Menu.Close);
                });
            });
        },

        Update : function(profile) {
            $("#in-user-name").html(profile.firstName + " " + profile.lastName);
            $("#in-user-profile")
                .attr("href", "https://www.linkedin.com/profile/view?id=" + profile.id)
                .attr("target", "_blank");
            $("#in-user-signout").unbind('click');
            $("#in-user-signout").click(function(){
                MOE.UI.Loading.Show();
                MOE.IN.API.Logout(function(r){
                    if (r.status === MOE.IN.RequestStatus.OK) {
                        location.reload();
                    }
                });
            });
            return MOE.UI.Menu;
        },

        Tag : function() {
            return MOE.UI.Menu.__tag;
        }
    },
    
    Tooltip : {
        __topAdjustment : 0,
        __leftAdjustment : 6,

        Hide : function() {
            $(".in-tt-tooltip").first().hide();
        },

        Show : function() {
            $(".in-tt-tooltip").first().show();
        },
        
        __setText : function(text) {
            $(".in-tt-tooltip-text").first().html(text);
        },
        
        __setPosition : function(top, left) {
            $(".in-tt-tooltip").first().css("top", top).css("left", left);
        },
        
        __getTooltip : function() {
            return $(".in-tt-tooltip");
        },

        For : function(elem, text) {
            $(elem)
                .unbind('mouseover')
                .unbind('mouseout')
                .attr('data-text', text)
                .mouseover(function(){
                    var me = $(this), offset = me.offset(),
                        ttTop = offset.top + Math.floor(((me.height() - MOE.UI.Tooltip.__getTooltip().height()) / 2)) + 
                            MOE.UI.Tooltip.__topAdjustment, 
                        ttLeft = offset.left + me.width() + MOE.UI.Tooltip.__leftAdjustment;
                    MOE.UI.Tooltip.__setText(me.attr('data-text'));
                    MOE.UI.Tooltip.__setPosition(ttTop, ttLeft);
                    MOE.UI.Tooltip.Show();
                })
                .mouseout(function(){
                    MOE.UI.Tooltip.Hide();
                });
        }
    },

    HintInput : {
        Set : function(elemId, hintText) {
            var jsElemId = "#" + elemId, elemHintId = elemId + "-hint", 
                jsElemHintId = "#" + elemHintId, jsElem = $(jsElemId), 
                jsElemHint = null, jsNewElem = null, elemHeight = jsElem.outerHeight();
                
            jsNewElem = $("<div>")
                            .css("position", "relative")
                            .css("display", "inline-block")
                            .css("width", (jsElem.outerWidth()+2).toString() + "px")
                            .css("height", (jsElem.outerHeight()+2).toString() + "px")
                            .append($("<div>")
                                        .css("position", "absolute")
                                        .css("top", "0px")
                                        .css("left", "0px")
                                        .append(jsElem.clone().css("z-index", "9")))
                            .append($("<div>")
                                        .css("position", "absolute")
                                        .css("top", "0px")
                                        .css("left", "0px")
                                        .attr("id", elemHintId)
                                        .append($("<span>")
                                                    .html(hintText)));
            jsElem.replaceWith(jsNewElem);
            jsElemHint = $(jsElemHintId);
            
            jsElemHint.css("margin-top", "6px");
            jsElemHint.css("margin-left", "6px");
            jsElemHint.css("z-index", "99");
            jsElemHint.click({"jsOwnerId":jsElemId}, function(e){
                $(this).hide();
                $(e.data.jsOwnerId).focus();
            });
            $(jsElemId)
                .focus(function() {
                    $(jsElemHintId).hide();
                })
                .blur(function() {
                    if (this.value === "") {
                        $(jsElemHintId).show();
                    } 
                });
            if ($(jsElemId).val().length > 0) $(jsElemHintId).hide();
        }
    },
    
    Loading : {
        Show : function() {
            $("#in-loading-ctrl").show();
        },
        
        Hide : function() {
            $("#in-loading-ctrl").hide();
        }
    },
    
    SignIn : {
        __holder : null,

        Initialize : function() {
            $("#in-signin-form").submit(function(){
                return false;
            });
            MOE.UI.HintInput.Set("in-signin-content-email", "Email address");
            MOE.UI.HintInput.Set("in-signin-content-password", "Password");
            $("#in-signin-content-send").unbind("click");
            $("#in-signin-content-send").click(function() {
                MOE.UI.Loading.Show();
                MOE.IN.API.Signin($("#in-signin-content-email").val(), $("#in-signin-content-password").val(), 
                    function(r) {
                        if (r.status === MOE.IN.RequestStatus.OK) {
                            setTimeout(function() {
                                MOE.checkEverythingIsInitialized();
                            }, 10);
                            console.log("[MOE.UI.SIGNIN] Sign In Successful!");
                        } else {
                            console.log("Login Response:", r.jqXHR);
                            var loginHTMLMsg = MOE.UI.SignIn.getLoginMessage(MOE.UI.SignIn.getChallengeCode(r.jqXHR));
                            $("#in-signin-content-error").html(loginHTMLMsg)
                            $("#in-signin-content-error").show();
                            MOE.UI.Loading.Hide();
                        }
                    });
            });
        },

        getChallengeCode : function(jqXHR) {
            var challenge = jqXHR.getResponseHeader("X-Login-Challenge");
            var challenge_url = jqXHR.getResponseHeader("X-Login-Challenge-URL");
            var challenge_code = (challenge_url ? "URL" : challenge);
//            console.log("Challenge:", challenge);
//            console.log("Challenge URL:", challenge_url);
//            console.log("Challenge Code:", challenge_code);
            return {
                "code": challenge_code,
                "url": challenge_url
            };
        },

        getLoginMessage : function (challenge) {
            challenge = challenge || {};
            challenge.code = challenge.code || "";
            switch (challenge.code.toUpperCase()) {
                case "SMS" :
                    return "You will recieve a text message containing a temporary code. Please use your password and this code to sign in.";
                case "EMAIL" :
                    return "You will recieve an email containing a temporary code. Please follow the instructions in it to proceed with sign in.";
                case "URL" :
                    return "Please follow <a target=\"_blank\" href=\""+challenge.url+"\">this link</a> to continue the login process.";
                default :
                    return "The email address or password you provided does not match our records.";
            }
        },

        Detach : function() {
            if (MOE.UI.SignIn.__holder === null) {
                $("#in-signin").siblings().show();
                MOE.UI.SignIn.__holder = $("#in-signin").detach();
            }
        },
        
        Attach : function(parent) {
            if (MOE.UI.SignIn.__holder !== null) {
                $(parent).children().hide();
                MOE.UI.SignIn.__holder.css("visibility", "visible");
                MOE.UI.SignIn.__holder.appendTo(parent);
                MOE.UI.SignIn.__holder = null;
            }
        }
    }
};

MOE.UI.Global = {
    USER_FOUND : 0,
    USER_NOT_FOUND : -10,
    SEARCH_STEP : 4
};

MOE.UI.ContactSync = function(ix, syncEvents) {
    this._ix = ix;
    this._syncEvents = syncEvents;
    this._complete = false;
};

MOE.UI.Renderer = {
    
    __maxOverviewLen : 140,
    __maxFieldsLen : 32,
    __maxActivities : 32,
    __maxDescLen : 32,
    __maxSearchDesc : 50,
    __maxSearchResults : 110,
    __loadingProfilePicture : "/htdocs/images/Spinner_30-1.gif",
    __emptyPicture : "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
    __noProfilePicture : "https://moe.linkedinlabs.com/htdocs/images/icon_no_photo_no_border_80x80.png",
    __noCompanyLogo : "https://moe.linkedinlabs.com/htdocs/images/icon_no_company_logo_60x60.png",
    __peopleBand : null,
    __tabIN : null,
    __pagerIN : null,
    __virtPeople : null,
    __virtGroups : null,
    __virtCompanies : null,
    __virtCompany : null,
    __peoplePanel : null,
    
    __clearProfile : function() {
        $("#in-conn-header-pic-img").attr("src", MOE.UI.Renderer.__noProfilePicture);
        $("#in-conn-header-info-name").html("");
        $("#in-conn-header-info-title").html("");
        $("#in-conn-header-info-location").html("");
        $("#in-conn-ext-row-current").hide();
        $("#in-conn-ext-row-past").hide();
        $("#in-conn-ext-row-education").hide();
        $("#in-conn-ext-info-current").html("");
        $("#in-conn-ext-info-past").html("");
        $("#in-conn-ext-info-education").html("");
        $("#in-conn-distance-badge").html("");
        $("#in-conn-distance-badge").hide();
        $("#person-connect").unbind('click');
        $("#person-connect").hide();
        $("#in-conn-profile-link").hide();
    },
    
    __clearInCommon : function() {
        $("#in-common-header-pic-img").attr("src", MOE.UI.Renderer.__noProfilePicture);
        $("#in-common-header-info-name").html("");
        $("#in-common-header-info-title").html("");
        $("#in-common-header-info-location").html("");
        $("#in-common-distance-badge").html("");
        $("#in-common-distance-badge").hide();
        $("#in-common-ext-row-groups").hide();
        if (!MOE.Utils.IsUndefOrNull(MOE.UI.Renderer.__virtPeople)) {
            MOE.UI.Renderer.__virtPeople.empty();
        }
        if (!MOE.Utils.IsUndefOrNull(MOE.UI.Renderer.__virtGroups)) {
            MOE.UI.Renderer.__virtGroups.empty();
        }
        if (!MOE.Utils.IsUndefOrNull(MOE.UI.Renderer.__virtCompanies)) {
            MOE.UI.Renderer.__virtCompanies.empty();
        }
    },
    
    __clearActivity : function() {
        $("#in-activity-header-pic-img").attr("src", MOE.UI.Renderer.__noProfilePicture);
        $("#in-activity-header-info-name").html("");
        $("#in-activity-header-info-title").html("");
        $("#in-activity-header-info-location").html("");
        $("#in-activity-distance-badge").html("");
        $("#in-activity-distance-badge").hide();
        $("#in-activity-ext-info-activities").empty();
    },
    
    __clearCompany : function() {
        $("#in-comp-header-pic-img").attr("src", MOE.UI.Renderer.__noCompanyLogo)
                                    .css("padding-top", 0);
        $("#in-comp-header-info-name").html("");
        $("#in-comp-header-info-person-name").html("");
        $("#in-comp-header-info-location").html("");
        $("#in-comp-distance-badge").html("");
        $("#in-comp-distance-badge").hide();
        $("#in-comp-ext-row-overview").hide();
        $("#in-comp-ext-row-industry").hide();
        $("#in-comp-ext-row-size").hide();
        $("#in-comp-ext-row-website").hide();
        $("#in-comp-ext-info-overview").html("");        
        $("#in-comp-ext-info-industry").html("");
        $("#in-comp-ext-info-size").html("");
        $("#in-comp-ext-info-website").html("");
        $("#in-comp-follow #follow-company").unbind('click');
        $("#follow-company").hide();
        $("#following-company").hide();
        $("#in-comp-profile-link").hide();
    },
    
    __clearSearch : function() {
        $("#in-mmatches-header-name").html("");
        $("#in-mmatches-header-email").html("");
        $("#in-mmatches-content-status").empty();
        $("#in-mmatches-content-list").empty();
        $("#nav-prev").unbind('click');
        $("#nav-next").unbind('click');
        $("#in-mmatches-invite").hide();        
        $("#in-mmatches-invite-send").unbind();
        $("#in-mmatches-invite-send").show();
        $("#in-mmatches-invite-msg").html("");
        $("#in-mmatches-invite-msg").hide("");
    },
    
    _eventOrCallback : function(eventName, eventArgs, callbackEnv) {
        if (typeof callbackEnv === "undefined" || callbackEnv === null) {
            MOE.IN.Events.Call(eventName, eventArgs);
        } else {
            var ea = eventArgs || { };
            ea["source"] = eventName;
            callbackEnv.cb.call(callbackEnv.owner, ea);
        }
    },

    __contactButton : function(index, contact) {
        var cid = "in-contact-"+index;
        var contactItem = $("<div>")
            .attr("class", "toolband-item-container-item")
            .attr("id", cid)
            .attr("data-email", contact.email())
            .attr("data-display-name", contact.displayName())
            .append(
                $("<img>")
                .addClass("in-peopleband-contact-picture")
                .attr("src", MOE.UI.Renderer.__emptyPicture)
            )
            .click(function() {
                if (MOE.IN.API.UseTLC() && 
                    MOE.Utils.IsUndefOrNull(MOE.UI.Renderer.__peopleBand.getContact(index).profile())) {
                    return false;
                }                
                
                var currIx = MOE.UI.Renderer.__peopleBand.selectedIndex(),
                    cid = "in-contact-"+currIx, ctt = MOE.UI.Renderer.__peopleBand.getContact(currIx);

                if (ctt.status() === MOE.MS.Status.TO_CONFIRM) {
                    ctt.clear();
                    ctt.status(MOE.MS.Status.REGULAR);
                    ctt.tag(MOE.UI.Global.USER_NOT_FOUND);
                    if ($("#"+cid).length > 0) {
                        MOE.UI.Tooltip.For("#"+cid, ctt.email());
                        $("#"+cid+" img").attr("src", MOE.UI.Renderer.__noProfilePicture);
                    }
                } else if (ctt.status() === MOE.MS.Status.CONFIRMED) {
                    ctt.status(MOE.MS.Status.REGULAR);
                    ctt.tag(MOE.UI.Global.USER_FOUND);
                }
                $("#in-conn-to-confirm").hide();
                $("#in-conn-confirmed").hide();
                MOE.UI.Renderer.__peopleBand.selectedIndex(index);
            });

        if ($("#"+cid).length === 0) $("#toolband-item-container").append(contactItem);
        else $("#"+cid).replaceWith(contactItem);
        
        var profile = contact.profile();
        if (!MOE.Utils.IsEmpty(profile)) {
            var dn = "";
            if (typeof profile.firstName !== "undefined") dn = profile.firstName;
            if (typeof profile.lastName !== "undefined" && dn.length > 0) dn += " " + profile.lastName;
            else dn = profile.lastName;
            MOE.UI.Tooltip.For("#"+cid, dn);
            $("#"+cid+" img").attr("src", (typeof profile.pictureUrl !== "undefined") ?
                                            MOE.Utils.MakeImgSecure(profile.pictureUrl) :
                                            MOE.UI.Renderer.__noProfilePicture);
        }    
        else {
            MOE.UI.Tooltip.For("#"+cid, contact.email());
        }
    },
	
	__selectedIndexChanged : function(index) {
        MOE.UI.Loading.Show();
        $("#in-tabs").hide();
        MOE.UI.Renderer.ClearAll();
		MOE.UI.Renderer.__tabIN.showTab(false, "#tabAtGlance");
        MOE.UI.Renderer.__tabIN.showTab(false, "#tabInCommon");
        MOE.UI.Renderer.__tabIN.showTab(false, "#tabRecentActivity");
        MOE.UI.Renderer.__tabIN.showTab(false, "#tabCompanyInfo");
        MOE.UI.Renderer.__tabIN.showTab(false, "#tabSearchResults");
        MOE.UI.Renderer.__tabIN.showTab(false, "#tabInvitePerson");
        MOE.UI.Renderer.__getProfileInfo(MOE.Store.Contacts.GetAt(index));
	},

	__getAtAGlanceInfo : function(contact, callbackEnv) {
		if (!MOE.Utils.IsUndefOrNull(contact.profile())) {
			var eventArgs = { 
				"email":contact.email(), 
				"available":!MOE.Utils.IsEmpty(contact.profile()),
				"contact":contact
			};
			MOE.UI.Renderer._eventOrCallback("profileRetrieved", eventArgs, callbackEnv);
			if (!MOE.IN.API.UseTLC() && eventArgs.available) {
                var distance = contact.profile().distance;
                if (distance === 1 || distance === 2) MOE.UI.Renderer.__getInCommonInfo(contact, callbackEnv);
                MOE.UI.Renderer.__getRecentActivity(contact, callbackEnv);
				MOE.UI.Renderer.__getCompanyInfo(contact, callbackEnv);
			}
		} else {
			MOE.IN.API.Profile(contact.email(), null, function(r, e) {
				if (r.status === MOE.IN.RequestStatus.OK) {
					e.profile(r.content);
					if (!MOE.IN.API.UseTLC()) {
                        var distance = e.profile().distance;
                        if (distance === 1 || distance === 2) MOE.UI.Renderer.__getInCommonInfo(e, callbackEnv);
                        MOE.UI.Renderer.__getRecentActivity(e, callbackEnv);
                        MOE.UI.Renderer.__getCompanyInfo(e, callbackEnv);
                    }                        
				} else { contact.profile({}); }
				var eventArgs = { 
					"email":e.email(), 
					"available":!MOE.Utils.IsEmpty(contact.profile()),
					"contact":e
				};
				MOE.UI.Renderer._eventOrCallback("profileRetrieved", eventArgs, callbackEnv);
			}, contact);
		}
	},
    
    __getInCommonInfo : function(contact, callbackEnv) {
		if (!MOE.Utils.IsUndefOrNull(contact.inCommon()) || !MOE.Utils.IsUndefOrNull(contact.inCommonGroups()) || 
		    !MOE.Utils.IsUndefOrNull(contact.inCommonCompanies())) {
			var eventArgs = { 
				"email":contact.email(), 
				"available":!MOE.Utils.IsEmpty(contact.inCommon()) || !MOE.Utils.IsEmpty(contact.inCommonGroups()) || !MOE.Utils.IsEmpty(contact.inCommonCompanies()),
				"contact":contact
			};
			MOE.UI.Renderer._eventOrCallback("inCommonRetrieved", eventArgs, callbackEnv);
		} else {		
            var id = !MOE.Utils.IsEmpty(contact.profile()) ? contact.profile().id : contact.email();
			MOE.IN.API.Related(id, MOE.IN.RelationToViewer.CONNECTIONS, function(r, e) {
				if (r.status === MOE.IN.RequestStatus.OK && 
					typeof r.content.relationToViewer.relatedConnections !== "undefined" && 
					r.content.relationToViewer.relatedConnections._total > 0) {
					
					var ids = [], total = 0;
					for (var ix = 0, len = r.content.relationToViewer.relatedConnections.values.length; ix < len; ix++) {
						ids.push(r.content.relationToViewer.relatedConnections.values[ix].id);
					}
					total = r.content.relationToViewer.relatedConnections._total;
					MOE.IN.API.Profile(ids, ["first-name", "last-name", "public-profile-url"], function(rr, ee) {
						if (rr.status === MOE.IN.RequestStatus.OK) {
							rr.content.total = ee.total;
							ee.ctt.inCommon(rr.content);
						}
						MOE.IN.API.Related(id, MOE.IN.RelationToViewer.GROUPS, function(rrr, eee) {
							if (rrr.status === MOE.IN.RequestStatus.OK) {
							    eee.inCommonGroups(rrr.content);
							    MOE.IN.API.Related(id, MOE.IN.RelationToViewer.COMPANIES, function(rrrr, eeee) {
							        if (rrrr.status === MOE.IN.RequestStatus.OK) {
							            eeee.inCommonCompanies(rrrr.content);
							        } else { eeee.inCommonCompanies({}); }
							        var eventArgs = { 
                                        "email":eeee.email(), 
                                        "available":!MOE.Utils.IsEmpty(eeee.inCommon()) || !MOE.Utils.IsEmpty(eeee.inCommonGroups()) || !MOE.Utils.IsEmpty(eeee.inCommonCompanies()),
                                        "contact":eeee
                                    };
                                    MOE.UI.Renderer._eventOrCallback("inCommonRetrieved", eventArgs, callbackEnv);
							    }, eee);
							}
							else { 
							    eee.inCommonGroups({});
							    MOE.IN.API.Related(id, MOE.IN.RelationToViewer.COMPANIES, function(rrrr, eeee) {
							        if (rrrr.status === MOE.IN.RequestStatus.OK) {
							            eeee.inCommonCompanies(rrrr.content);
							        } else { eeee.inCommonCompanies({}); }
							        var eventArgs = { 
                                        "email":eeee.email(), 
                                        "available":!MOE.Utils.IsEmpty(eeee.inCommon()) || !MOE.Utils.IsEmpty(eeee.inCommonGroups()) || !MOE.Utils.IsEmpty(eeee.inCommonCompanies()),
                                        "contact":eeee
                                    };
                                    MOE.UI.Renderer._eventOrCallback("inCommonRetrieved", eventArgs, callbackEnv);
							    }, eee);
							}
						}, ee.ctt);
					}, {"ctt":e, "total":total});
				} else {
					e.inCommon({});
					MOE.IN.API.Related(e.email(), MOE.IN.RelationToViewer.GROUPS, function(rrr, eee) {
						if (rrr.status === MOE.IN.RequestStatus.OK) {
						    eee.inCommonGroups(rrr.content);
						    MOE.IN.API.Related(id, MOE.IN.RelationToViewer.COMPANIES, function(rrrr, eeee) {
                                if (rrrr.status === MOE.IN.RequestStatus.OK) {
                                    eeee.inCommonCompanies(rrrr.content);
                                }
                                var eventArgs = { 
                                    "email":eeee.email(), 
                                    "available":!MOE.Utils.IsEmpty(eeee.inCommon()) || !MOE.Utils.IsEmpty(eeee.inCommonGroups()) || !MOE.Utils.IsEmpty(eeee.inCommonCompanies()),
                                    "contact":eeee
                                };
                                MOE.UI.Renderer._eventOrCallback("inCommonRetrieved", eventArgs, callbackEnv);
                            }, eee);
						} else { 
						    eee.inCommonGroups({});
						    MOE.IN.API.Related(id, MOE.IN.RelationToViewer.COMPANIES, function(rrrr, eeee) {
                                if (rrrr.status === MOE.IN.RequestStatus.OK) {
                                    eeee.inCommonCompanies(rrrr.content);
                                } else { eeee.inCommonCompanies({}); }
                                var eventArgs = { 
                                    "email":eeee.email(), 
                                    "available":!MOE.Utils.IsEmpty(eeee.inCommon()) || !MOE.Utils.IsEmpty(eeee.inCommonGroups()) || !MOE.Utils.IsEmpty(eeee.inCommonCompanies()),
                                    "contact":eeee
                                };
                                MOE.UI.Renderer._eventOrCallback("inCommonRetrieved", eventArgs, callbackEnv);
                            }, eee); 
						}
					}, e);
				}
			}, contact);
		}
    },
	
	__getRecentActivity : function(contact, callbackEnv) {
		if (!MOE.Utils.IsUndefOrNull(contact.activity())) {
			var eventArgs = { 
				"email":contact.email(), 
				"available":!MOE.Utils.IsEmpty(contact.activity()),
				"contact":contact
			};
			MOE.UI.Renderer._eventOrCallback("recentActivityRetrieved", eventArgs, callbackEnv);
		} else {
            var id = !MOE.Utils.IsEmpty(contact.profile()) ? contact.profile().id : contact.email();
			MOE.IN.API.RecentActivity(id, function(r, e) {
				if (r.status === MOE.IN.RequestStatus.OK && 
					typeof r.content !== "undefined" && r.content._total > 0) {
					e.activity(r.content);
				} else { e.activity({}); }
				var eventArgs = { 
					"email":e.email(), 
					"available":!MOE.Utils.IsEmpty(e.activity()),
					"contact":e
				};
				MOE.UI.Renderer._eventOrCallback("recentActivityRetrieved", eventArgs, callbackEnv);
			}, contact);
		}
	},
	
	__getCompanyInfo : function(contact, callbackEnv) {
		if (!MOE.Utils.IsUndefOrNull(contact.company())) {
			var eventArgs = { 
				"email":contact.email(), 
				"available":!MOE.Utils.IsEmpty(contact.company()),
				"contact":contact
			};
			MOE.UI.Renderer._eventOrCallback("companyInfoRetrieved", eventArgs, callbackEnv);
		} else {
			if (typeof contact.profile().threeCurrentPositions !== "undefined" && 
				typeof contact.profile().threeCurrentPositions.values !== "undefined") {
				
				var searchKEY = "";
				if (typeof contact.profile().threeCurrentPositions.values[0].company.id !== "undefined") {
					searchKEY = contact.profile().threeCurrentPositions.values[0].company.id;
				} else if (typeof contact.profile().threeCurrentPositions.values[0].company.universalName !== "undefined") {
					searchKEY = contact.profile().threeCurrentPositions.values[0].company.universalName;
				} else if (typeof contact.profile().threeCurrentPositions.values[0].company.name !== "undefined") {
					searchKEY = contact.profile().threeCurrentPositions.values[0].company.name.toLowerCase().replace(" ", "-");
				}
				
				if (!MOE.Store.Local.Contains("company:"+searchKEY)) {
					MOE.IN.API.Company(searchKEY, null, function(r, e) {
					    MOE.IN.Cache.OwnFollowingCompanies(function(cpies) {
						    if (r.status == MOE.IN.RequestStatus.OK) {
							    e.extraData.company(r.content);
							    MOE.Store.Local.Add("company:"+e.key, r.content);
							    var found = false;
							    if (cpies !== null) {
								    for (var ix = 0, len = cpies.length; ix < len && found === false; ix++) {
									    if (cpies[ix].id === e.extraData.company().id) found = true;
								    }
								    e.extraData.company().following = found;
							    } else {
								    e.extraData.company().following = false;
							    }
						    }
						    var eventArgs = {
							    "email":e.extraData.email(), 
							    "available":(e.extraData.company() !== null),
							    "contact":e.extraData
						    };
						    MOE.UI.Renderer._eventOrCallback("companyInfoRetrieved", eventArgs, callbackEnv);
					    });
					}, contact);

				} else {
					contact.company(MOE.Store.Local.Get("company:"+searchKEY));
					var eventArgs = { 
						"email":contact.email(), 
						"available":true,
						"contact":contact
					};
					MOE.UI.Renderer._eventOrCallback("companyInfoRetrieved", eventArgs, callbackEnv);
				}
			} else {
				contact.company({});
			}
		}
	},

	__getProfileInfo : function(contact, callbackEnv) {
		MOE.UI.Renderer.__getAtAGlanceInfo(contact, callbackEnv);	    
    },
	
	__initializePictures : function() {
		var ctts = MOE.UI.Renderer.__peopleBand.getContacts(), ixs = {}, emails = [], email = "";
		for (var ix = 1, len = ctts.length; ix < len; ix++) {
			email = ctts[ix].email();
			ixs[email] = ix;
			emails.push(email);
		}
		MOE.IN.API.Profile(emails, null, function(r, e) {
			var eventArgs = { "available":false, "profilePics":[], "indexes":e }, email = "", displayName = "";
			if (r.status === MOE.IN.RequestStatus.OK && r.content._total > 0) {
				eventArgs.available = true;
				for (var ix = 0, len = r.content.values.length; ix < len; ix++) {
					email = r.content.ids[r.content.values[ix]._key];
					displayName = r.content.values[ix].firstName + " " + r.content.values[ix].lastName;					
					if (typeof email === "undefined") email = r.content.values[ix]._key.replace("email=", "");
                    
                    var cid = "in-contact-"+e[email];
                    MOE.UI.Renderer.__peopleBand.getContact(e[email]).profile(r.content.values[ix]);
                    MOE.UI.Renderer.__peoplePanel.getContact(e[email]).profile(r.content.values[ix]);
                    MOE.UI.Renderer.__peoplePanel.updateIndex(e[email]);
                    MOE.UI.Tooltip.For("#"+cid, displayName);
					
					eventArgs.profilePics.push({
						"email":email,
						"displayName":displayName,
						"picture":r.content.values[ix].pictureUrl
					});
				}
			}
			MOE.IN.Events.Call("picturesRetrieved", eventArgs);
			MOE.IN.Events.Call("allProfilesRetrieved", eventArgs);
		}, ixs);
    },
    
    __createContactSync : function(ix, ctt) {
        var syncEvents = { };
        if (!MOE.Utils.IsEmpty(ctt.profile()) && ctt.profile().distance > -1 && ctt.profile().distance < 4) {
            syncEvents["profileRetrieved"] = false;
            if (ctt.profile().distance === 1 || ctt.profile().distance === 2) syncEvents["inCommonRetrieved"] = false;
            syncEvents["recentActivityRetrieved"] = false;
            syncEvents["companyInfoRetrieved"] = false;
        }
        return new MOE.UI.ContactSync(ix, syncEvents);
    },
    
    __contactsWorker : function(eventArgs) {
        if (!this._complete) {
            var done = true;
            if (!MOE.Utils.IsEmpty(this._syncEvents)) {
                this._syncEvents[eventArgs.source] = true;
                for (key in this._syncEvents) {
                    done &= this._syncEvents[key];
                }
            }
            
            if (done) {
                this._complete = true;
                var ctt = MOE.UI.Renderer.__peopleBand.getContact(this._ix + 1);
                if (typeof ctt !== "undefined" && ctt !== null) {
                    var sync = MOE.UI.Renderer.__createContactSync(this._ix + 1, ctt);
                    MOE.UI.Renderer.__getProfileInfo(ctt, {"cb":MOE.UI.Renderer.__contactsWorker, "owner":sync});
                } 
            }
        }
    },
    
    __initializeHandlers : function() {
        MOE.IN.Events.On("profileRetrieved", function(eventArgs) {
            if (MOE.UI.Renderer.__peopleBand.selectedContact().email() === eventArgs.email) {
                if (eventArgs.available === true) {
					MOE.UI.Renderer.__tabIN.showTab(true, "#tabAtGlance");
                    MOE.UI.RenderAtAGlance(eventArgs.contact);
                    MOE.UI.Renderer.__peopleBand.updateIndex(MOE.UI.Renderer.__peopleBand.selectedIndex());
                    MOE.UI.Renderer.__peoplePanel.updateIndex(0);
                    if (eventArgs.contact.profile().distance !== 1) {
                        $("#in-tabs").fadeIn();
                        MOE.UI.Renderer.__tabIN.select("tabAtGlance");
                    }
                } else {
                    eventArgs.contact.tag(MOE.UI.Global.USER_NOT_FOUND);
                    MOE.UI.RenderSearch(true);
                }
                MOE.IN.Events.Call("menuInitialization");
            }
        });
        
        MOE.IN.Events.On("inCommonRetrieved", function(eventArgs) {
            if (MOE.UI.Renderer.__peopleBand.selectedContact().email() === eventArgs.email) {
                if (eventArgs.available === true) {
                    MOE.UI.Renderer.__tabIN.showTab(true, "#tabInCommon");
                }
            }
        });
        
        MOE.IN.Events.On("recentActivityRetrieved", function(eventArgs) {
            if (MOE.UI.Renderer.__peopleBand.selectedContact().email() === eventArgs.email) {
                if (eventArgs.available === true) {
                    MOE.UI.Renderer.__tabIN.showTab(true, "#tabRecentActivity");
                    if (eventArgs.contact.profile().distance === 1 && eventArgs.contact.status() !== MOE.MS.Status.TO_CONFIRM) {
                        $("#in-tabs").fadeIn();
                        MOE.UI.Renderer.__tabIN.select("tabRecentActivity");
                        return;
                    }
                }
                $("#in-tabs").fadeIn();
                MOE.UI.Renderer.__tabIN.select("tabAtGlance");                
            }
        });
        
        MOE.IN.Events.On("companyInfoRetrieved", function(eventArgs) {
            if (MOE.UI.Renderer.__peopleBand.selectedContact().email() === eventArgs.email) {
                if (eventArgs.available === true) {
                    MOE.UI.Renderer.__tabIN.showTab(true, "#tabCompanyInfo");
                }
            }
        });

		MOE.IN.Events.On("picturesRetrieved", function(eventArgs) {
			if (eventArgs.available === true) {
				for (var ix = 0, len = eventArgs.profilePics.length; ix < len; ix++) {
					$("#in-contact-" + eventArgs.indexes[eventArgs.profilePics[ix].email] + " img").attr("src", MOE.Utils.MakeImgSecure(eventArgs.profilePics[ix].picture));
					$("#in-contact-" + eventArgs.indexes[eventArgs.profilePics[ix].email]).attr("data-display-name", eventArgs.displayName);
				}
			}
        });
        
        MOE.IN.Events.On("allProfilesRetrieved", function(eventArgs) {
            setTimeout(function() {
                var ctt = MOE.UI.Renderer.__peopleBand.getContact(1);
                if (typeof ctt !== "undefined" && ctt !== null) {
                    var sync = MOE.UI.Renderer.__createContactSync(1, ctt);
                    MOE.UI.Renderer.__getProfileInfo(ctt, {"cb":MOE.UI.Renderer.__contactsWorker, "owner":sync});
                }
			}, 1000);
        });
        
        MOE.IN.Events.On("searchResultsReady", function(eventArgs) {
            if (MOE.UI.Renderer.__peopleBand.selectedContact().email() === eventArgs.email) {
                MOE.UI.Renderer.__tabIN.showTabButtons(false);
                MOE.UI.Renderer.__tabIN.select("tabSearchResults");
            }
        });
        
        MOE.IN.Events.On("displayInvite", function(eventArgs) {
            if (MOE.UI.Renderer.__peopleBand.selectedContact().email() === eventArgs.email) {
                $("#in-tabs").fadeIn();
                MOE.UI.Renderer.__tabIN.showTabButtons(false);
                MOE.UI.Renderer.__tabIN.select("tabInvitePerson");
            }
        });
    },
    
    InitializeContent : function() {
        $("#inLogin").hide();
        MOE.UI.Tooltip.Hide();
        $('html').unbind('click').click(function() {
            MOE.UI.Tooltip.Hide();
        });

        MOE.UI.Renderer.__initializeHandlers();
        MOE.UI.Renderer.__peopleBand = new MOE.UI.PeopleBand(MOE.UI.Renderer.__contactButton, MOE.UI.Renderer.__selectedIndexChanged);
        MOE.UI.Renderer.__peopleBand.initialize();

        MOE.UI.Renderer.__peoplePanel = new MOE.UI.PeoplePanel("people-panel", {"width":368, "height":76}, function(item) {
            var cid = "people-panel-item-" + item.index, contactItem = null, aux = null, 
                dist = -1, prof = item.contact.profile(), ctr = $("<div>"), row = null;
                
            var distBadget = function(dist) {
                switch (dist) {
                    case 1:
                        return "st";
                    case 2:
                        return "nd";
                    case 3:
                        return "rd"
                    default:
                        return "";
                } 
            };
            
            if (typeof prof !== "undefined" && prof !== null) dist = prof.distance;
            
            row = $("<div>")
                    .css("display", "table-row")
                    .css("max-width", "inherit")
                    .append($("<div>")
                            .css("display", "table-cell")
                            .css("max-width", "inherit")
                            .append($("<span>")
                                    .attr("class","in-panel-info-header-name")
                                    .attr("id", "info-header-name-" + item.index)
                                    .html(item.contact.displayName())));
            
            ctr
                .css("width", "256px")
                .css("max-width", "256px")
                .append($("<div>")
                        .css("display", "table")
                        .css("table-layout", "fixed")
                        .css("max-width", "inherit")
                        .append(row));
            
            if (typeof dist !== "undefined" && dist > 0 && dist < 4) {
                row.append($("<div>")
                            .css("display","table-cell")
                            .append($("<span>")
                                    .attr("class", "in-panel-network-degree")
                                    .html(dist + "<span>" + distBadget(dist) + "</span>")));
            }
            
            aux = $("<div>")
                    .attr("class", "people-panel-item-table-row-cell")
                    .append(ctr);

            aux
                .append($("<div>")
                        .attr("class","info-header-title")
                        .attr("id", "info-header-title-" + item.index))
                .append($("<div>")
                        .attr("class","info-header-location")
                        .attr("id", "info-header-location-" + item.index));

            contactItem = $("<div>")
                .attr("class", "people-panel-item")
                .attr("id", cid)
                .append($("<div>")
                        .attr("class", "people-panel-item-table")
                        .append($("<div>")
                                .attr("class", "people-panel-item-table-row")
                                .append($("<div>")
                                        .attr("class", "people-panel-item-table-row-cell-img")
                                        .append($("<div>")
                                                .attr("class", "people-panel-item-table-row-cell-img-ctr")
                                                .append($("<img>")
                                                        .attr("width", "60")
                                                        .attr("height", "60")
                                                        .attr("id", "info-header-picture-" + item.index)
                                                        .attr("src", MOE.UI.Renderer.__noProfilePicture))))
                                .append(aux)));
            
            contactItem.click({"index":item.index}, function(e) {
                if (MOE.UI.Renderer.__peoplePanel.clickable()) {
                    MOE.UI.Renderer.__peopleBand.selectedIndex(e.data.index);
                    $("#in-main-container-for-ie").css("display", "none");
                    $("#in-main-central").css("display", "table");
                }
            });

            if ($("#"+cid).length === 0) this.container().append(contactItem);
            else $("#"+cid).replaceWith(contactItem);
            
            contactItem
                .mouseenter({"me":contactItem}, function(e) {
                    if (!MOE.IN.API.UseTLC()) e.data.me.css("background-color", "#EAECEE");
                })
                .mouseleave({"me":contactItem}, function(e) {
                    if (!MOE.IN.API.UseTLC()) e.data.me.css("background-color", "#FFFFFF");
                });
                
            if (item.contact.profile() !== null) {
            
                if (typeof item.contact.profile().pictureUrl !== "undefined") {
                    $("#info-header-picture-" + item.index).attr("src", MOE.Utils.MakeImgSecure(item.contact.profile().pictureUrl));
                }
            
                // set values if available
                var fullname = ""
                if (typeof item.contact.profile().firstName !== "undefined") {
                    fullname += item.contact.profile().firstName;
                }
                if (typeof item.contact.profile().lastName !== "undefined") {
                    fullname += " " + item.contact.profile().lastName;
                }
                fullname = MOE.Utils.Trim(fullname);
                if (fullname.length > 0) {
                    $("#info-header-name-" + item.index).html(fullname);
                }
                
                if (typeof item.contact.profile().headline !== "undefined" && item.contact.profile().headline.length > 0) {
                    $("#info-header-title-" + item.index).html(item.contact.profile().headline);
                }
                
                var locInfo = "";
                if (typeof item.contact.profile().location !== "undefined" && item.contact.profile().location.name.length > 0) {
                    locInfo = item.contact.profile().location.name;
                }
                if (typeof item.contact.profile().industry !== "undefined" && item.contact.profile().industry.length > 0) {
                    if (locInfo.length > 0) locInfo += " | ";
                    locInfo += item.contact.profile().industry;
                }
                $("#info-header-location-" + item.index).html(locInfo);
                
                if (!MOE.UI.Renderer.__peoplePanel.clickable()) {
                    $("#"+cid).css("cursor", "default");
                }
            }
        });
        MOE.UI.Renderer.__peoplePanel.initialize();
        
        MOE.UI.Renderer.__tabIN = new MOE.UI.Tabs({
            "activated" : function(tabId, extraData) {
                MOE.UI.Renderer.__tabIN.showTabButtons(true);
                switch (tabId) {
                    case "tabAtGlance":
                        if (MOE.IN.API.UseTLC()) {
                            MOE.UI.SignIn.Attach($("#in-conn-ext-info"));
                        }
                        break;
                        
                    case "tabInCommon":
                        if (MOE.IN.API.UseTLC()) {
                            MOE.UI.SignIn.Attach($("#in-common-ext-info"));
                        }
                        MOE.UI.RenderInCommon(MOE.UI.Renderer.__peopleBand.selectedContact());
                        break;
                        
                    case "tabRecentActivity":
                        if (MOE.IN.API.UseTLC()) {
                            MOE.UI.SignIn.Attach($("#in-activity-ext-info"));
                        }
                        MOE.UI.RenderRecentActivity(MOE.UI.Renderer.__peopleBand.selectedContact());
                        break;
                        
                    case "tabCompanyInfo":
                        if (MOE.IN.API.UseTLC()) {
                            MOE.UI.SignIn.Attach($("#in-comp-ext-info"));
                        }
                        MOE.UI.RenderCompanyInfo(MOE.UI.Renderer.__peopleBand.selectedContact());
                        break;
                        
                    case "tabSearchResults":
                        MOE.UI.Renderer.__tabIN.showTabButtons(false);                                            
                        break;
                    
                    case "tabInvitePerson":
                        MOE.UI.Renderer.__tabIN.showTabButtons(false);
                        MOE.UI.RenderInvite();
                        break;
                        
                    default:
                        console.warn("Unknown Tab Id!!!");
                }
            }
        });
        
        MOE.UI.Renderer.__virtPeople = new MOE.UI.VirtList("in-common-ext-info-people", function(remaining) {
            var obj = $("#MOETotalPeopleRemaining"), objLink = $("#MOETotalPeopleRemainingLink");
            if (remaining > 0) {
                objLink.html("and " + remaining + " more...");
                obj.css("display", "inline");
            } else {
                objLink.html("");
                obj.css("display", "none");
            }
        }, function(e) {
            e.data.me._updateContent();
        });
        
        MOE.UI.Renderer.__virtGroups = new MOE.UI.VirtList("in-common-ext-info-groups", function(remaining) {
            var obj = $("#MOETotalGroupsRemaining"), objLink = $("#MOETotalGroupsRemainingLink");
            if (remaining > 0) {
                objLink.html("and " + remaining + " more...");
                obj.css("display", "inline");
            } else {
                objLink.html("");
                obj.css("display", "none");
            }
        }, function(e) {
            e.data.me._updateContent();
        });
        
        MOE.UI.Renderer.__virtCompanies = new MOE.UI.VirtList("in-common-ext-info-companies", function(remaining) {
            var obj = $("#MOETotalCompaniesRemaining"), objLink = $("#MOETotalCompaniesRemainingLink");
            if (remaining > 0) {
                objLink.html("and " + remaining + " more...");
                obj.css("display", "inline");
            } else {
                objLink.html("");
                obj.css("display", "none");
            }
        }, function(e) {
            e.data.me._updateContent();
        });
        
        MOE.UI.Renderer.__virtCompany = new MOE.UI.VirtField("in-comp-ext-info-overview", 
            function(d) {
                return "<a href='http://www.linkedin.com/company/"+d+"' target='_blank' class='see-more'>see more &raquo;</a>"; 
            }, 
            function(e) {
                e.data.me.updateContent();
            });
        
        $("#in-main").show();
    },
    
    InitializePeopleBand : function() {
        console.log("[MOE.UI.INITIALIZEPEOPLEBAND] Initializing People Band...");
        var len = MOE.Store.Contacts.GetLength();
        MOE.UI.Renderer.__peopleBand.empty();
        for (var idx = 0; idx < len; idx++) {
            MOE.UI.Renderer.__peopleBand.addContact(MOE.Store.Contacts.GetAt(idx));
        }
        $("#in-count-label").html(len);
        MOE.UI.Renderer.__peopleBand.update();
        console.log("[MOE.UI.INITIALIZEPEOPLEBAND] Initializing People Band... done");
    },
    
    InitializePeoplePanel : function() {
        console.log("[MOE.UI.INITIALIZEPEOPLEPANEL] Initializing People panel...");
        var len = MOE.Store.Contacts.GetLength();
        MOE.UI.Renderer.__peoplePanel.emptyAll();
        for (var idx = 0; idx < len; idx++) {
            var data = {"contact":MOE.Store.Contacts.GetAt(idx), "index":idx};
            MOE.UI.Renderer.__peoplePanel.addItem(data);
        }
        $("#in-count-label").html(len);
        MOE.UI.Renderer.__peoplePanel.update();
        console.log("[MOE.UI.INITIALIZEPEOPLEPANEL] Initializing People panel... Done");
    },
    
    InitializeData : function() {
        console.log("Initializing Data...");
        if (MOE.IN.API.UseTLC() === true) {
            console.log("Initializing Data using Two-Legged OAuth...");
            $("#in-main-people-panel").css("display", "table");
            $("#in-main-central").css("display", "none");
            $("#people-panel-signin-row").css("display", "table-row");
            MOE.UI.Renderer.__peoplePanel.clickable(false);
            
            var __profileCallback = function(r, e) {
                var email = e.key;
                if ((r.status === MOE.IN.RequestStatus.OK) && (typeof r.content !== "undefined") && (r.content._key === "email="+email)) {
                    MOE.Store.Contacts.Get(email).profile(r.content);
                } else {
                    MOE.Store.Contacts.Get(email).profile({
                        "firstName":MOE.Store.Contacts.Get(email).displayName(),
                        "lastName":"",
                        "pictureUrl":MOE.UI.Renderer.__noProfilePicture,
                        "headline":"", "industry":"",
                        "location":{"name":""}
                    });
                }
                MOE.UI.Renderer.__peoplePanel.updateIndex(e.index);
            };
            
            for (var ix = 0, len = MOE.Store.Contacts.GetLength(); ix < len; ix++) {
                var contact = MOE.Store.Contacts.GetAt(ix), email = contact.email();
                MOE.IN.API.Profile(email, MOE.IN.API.__profileFieldsTLC, __profileCallback, {"key":email, "index":ix});
            }
            MOE.UI.Loading.Hide();
            
        } else {
            $("#toolband-container").show();
            $("#people-panel-signin-row").css("display", "none");
            $("#people-panel").css("border-bottom", "0");
            // had to do this to support IE9
            (function(){
                var winHeight = $(window).height(), netWinHeight = winHeight - 32, rowHeight = netWinHeight - 10;
                $("#in-main-container-for-ie").css("height", netWinHeight.toString() + "px");
                $("#in-main-container-for-ie-row").css("height", rowHeight.toString() + "px");
                $("#in-main-container-for-ie-cell").css("height", rowHeight.toString() + "px");
                if ($.browser.msie) $("#people-panel").css("height", "100%");
            })();
            $(window).resize();
            MOE.UI.Renderer.__initializePictures();
            MOE.UI.Renderer.__peoplePanel.clickable(true);
            MOE.UI.Renderer.__peopleBand.selectedIndex(0);
        }
    },
    
    Profile : function(data, extraData) {
        /* header */
        $("#in-conn-header-pic-img").attr("src", MOE.Utils.MakeImgSecure(data.pictureUrl));
        $("#in-conn-header-info-name").html(data.firstName + " " + data.lastName)
                                      .prop('title', data.firstName + " " + data.lastName);
        $("#in-conn-header-info-title").html(data.headline);
        
        if (data.distance > 0 && data.distance < 4) {
            MOE.UI.Renderer.DistanceBadge("#in-conn-distance-badge", data.distance);
        }
        
        var locInfo = "";
        if (typeof data.location !== "undefined" && data.location.name.length > 0) {
            locInfo = data.location.name;
        }
        if (typeof data.industry !== "undefined" && data.industry.length > 0) {
            if (locInfo.length > 0) locInfo += " | ";
            locInfo += data.industry;

        }
        $("#in-conn-header-info-location").html(locInfo);
        
        /* extra info */
        if (typeof data.threeCurrentPositions !== "undefined" && data.threeCurrentPositions._total > 0) {
            var curr = data.threeCurrentPositions.values[0].title + " at " +
                       data.threeCurrentPositions.values[0].company.name;
            $("#in-conn-ext-info-current").html(curr);
            $("#in-conn-ext-row-current").show();
        }
        
        if (typeof data.positions !== "undefined" && data.positions._total > 1) {
            /* position at 0 is the current position */
            var past = data.positions.values[1].title + " at " +
                       data.positions.values[1].company.name;
            $("#in-conn-ext-info-past").html(past);
            $("#in-conn-ext-row-past").show();
        }
        
        if (typeof data.educations !== "undefined" && data.educations._total > 0) {
            $("#in-conn-ext-info-education").html(data.educations.values[0].schoolName);
            $("#in-conn-ext-row-education").show();
        }
        
        if (typeof data.siteStandardProfileRequest !== "undefined" &&
            typeof data.siteStandardProfileRequest.url !== "undefined") {
            $("#in-conn-profile-link").attr("href", MOE.Utils.UnEscapeHTML(data.siteStandardProfileRequest.url));
            $("#in-conn-profile-link").show();
        } else if (typeof data.publicProfileUrl !== "undefined") {
            $("#in-conn-profile-link").attr("href", MOE.Utils.UnEscapeHTML(data.publicProfileUrl));
            $("#in-conn-profile-link").show();
        }
        
        if (typeof data.distance !== "undefined") {
            if (data.distance !== 0 && data.distance !== 1 && 
                (typeof data.invitationSent === "undefined" || (typeof data.invitationSent !== "undefined" && data.invitationSent === false))) {
                $("#person-connect").show();
                $("#person-connect").click(function(){
                    MOE.IN.API.Connect({"email":extraData.email, "firstName":data.firstName, "lastName":data.lastName}, function(r, e) {
                        if (r.status === MOE.IN.RequestStatus.OK || r.statusHTTP === 403) {
                            $("#in-conn-profile-link").attr("class", "InActionButton");
                            $("#person-connect").hide();
                            e.invitationSent = true;
                        }
                    }, data);
                });
                $("#in-conn-profile-link").attr("class", "InLinkButton");
            } else if ((data.distance === 0 || data.distance === 1) ||
                        (typeof data.invitationSent !== "undefined" && data.invitationSent === true)) {            
                $("#in-conn-profile-link").attr("class", "InActionButton");
            }
        }
    },
    
    Company : function(company, extraData) {
        if (typeof company !== "undefined" && company !== null) {
            /* header */
            var imgUrl;
	        if ( typeof company.logoUrl !== "undefined" ) {
                imgUrl=company.logoUrl;
            } else if ( typeof company.squareLogoUrl !== "undefined" ) {
                imgUrl=company.squareLogoUrl;
            } else {
                imgUrl= MOE.UI.Renderer.__noCompanyLogo ;
            }
            $("#in-comp-header-pic-img").attr("src", MOE.Utils.MakeImgSecure(imgUrl));
            $("#in-comp-header-pic-img").load(function() {
                $("#in-comp-header-pic-img").css("padding-top", (60 - $("#in-comp-header-pic-img").height()) / 2);
            });

            $("#in-comp-header-info-name").html(company.name)
                                          .prop('title', company.name);
            $("#in-comp-header-info-person-name").html(extraData.profile.firstName + " " + extraData.profile.lastName);        
            $("#in-comp-header-info-location").html(extraData.profile.location.name + " | " + extraData.profile.industry);
            
            if (extraData.profile.distance > 0 && extraData.profile.distance < 4) {
                MOE.UI.Renderer.DistanceBadge("#in-comp-distance-badge", extraData.profile.distance);
            }
            
            
        
            /* extra info */
            $("#in-comp-ext-row-overview").show();
            if (typeof company.description !== "undefined" && company.description.length > 0) {
                MOE.UI.Renderer.__virtCompany.data(company.id);
                MOE.UI.Renderer.__virtCompany.str(company.description);
                MOE.UI.Renderer.__virtCompany.initialize();
            } else {
                $("#in-comp-ext-row-overview").hide();
            }
            
            if (typeof company.industry !== "undefined") {
                $("#in-comp-ext-info-industry").html(company.industry);
                $("#in-comp-ext-row-industry").show();
            }
            if (typeof company.employeeCountRange !== "undefined") {
                $("#in-comp-ext-info-size").html(company.employeeCountRange.name);
                $("#in-comp-ext-row-size").show();
            }
            if (typeof company.websiteUrl !== "undefined") {
                $("#in-comp-ext-info-website").html(company.websiteUrl);
                $("#in-comp-ext-info-website").attr("href", company.websiteUrl);
                $("#in-comp-ext-row-website").show();
            }
            
            if (extraData.following === false) {
                $("#following-company").hide();
                $("#follow-company").show();
                $("#follow-company").click(function() {
                    MOE.IN.API.Follow(company.id, function(r, e) { 
                        if (r.status === MOE.IN.RequestStatus.OK) {
                            $("#follow-company").hide();
                            $("#following-company").show();
                        }
                    });
                });
            } else {
                $("#following-company").show();
            }
            $("#in-comp-profile-link").attr("href", "http://www.linkedin.com/company/"+company.id);
            $("#in-comp-profile-link").show();
        }
    },
    
    RecentActivity : function(activities, profile) {
        /* header */
        $("#in-activity-header-pic-img").attr("src", MOE.Utils.MakeImgSecure(profile.pictureUrl));
        $("#in-activity-header-info-name").html(profile.firstName + " " + profile.lastName)
                                          .prop('title', profile.firstName + " " + profile.lastName);
        $("#in-activity-header-info-title").html(profile.headline);
        $("#in-activity-header-info-location").html(profile.location.name + " | " + profile.industry);
        
        if (profile.distance > 0 && profile.distance < 4) {
            MOE.UI.Renderer.DistanceBadge("#in-activity-distance-badge", profile.distance);
        }
        
        /* activities */
        var displayName = profile.firstName;

        $("#in-activity-ext-info-activities")
            .append($("<div>")
                    .attr("id", "in-activity-ext-info-see-more")
                    .append($("<a>")
                            .attr("id", "in-activity-ext-more")
                            .attr("target", "_blank")
                            .attr("href", "http://www.linkedin.com/profile/feed?id=" + profile.id)
                            .html("See more activity &raquo;")
                            .addClass("InActionButton")));
        
        if (!MOE.Utils.IsEmpty(activities) && typeof activities.values !== "undefined") {
            for (var ix = 0, len = activities.values.length; ix < len && ix < MOE.UI.Renderer.__maxActivities; ix++) {
                var content = null, like = null, comment = null, gestures = null, theAtt = activities.values[ix], url = "";
                
                /* For this kind of activity you won't find the standard data structure */
                if (theAtt.updateType === "MSFC") url = MOE.Utils.UnEscapeHTML(theAtt.updateContent.companyPersonUpdate.person.siteStandardProfileRequest.url);
                else url = MOE.Utils.UnEscapeHTML(theAtt.updateContent.person.siteStandardProfileRequest.url);
                
                content = $("<div>")
                            .append($("<a>")
                                .attr("href", MOE.IN.Tracking.AddInfo(url))
                                .attr("target", "_blank")
                                .attr("class", "activity-stat")
                                .html(displayName));
                if (theAtt.updateType === "STAT") {
                    content
                        .append(" ")
                        .append(MOE.Utils.ActivateURLs(theAtt.updateContent.person.currentStatus));
                } else if (theAtt.updateType === "CONN") {                
                    content
                        .append(" is now connected to ");
                                
                    var appended = false;
                    
                    for (var jx = 0, len_a = theAtt.updateContent.person.connections.values.length; jx < len_a; jx++) {
                        if (appended === true) {
                            content.append(", ");
                        }
                        
                        var cttUrl = MOE.IN.Tracking.AddInfo(MOE.Utils.UnEscapeHTML(theAtt.updateContent.person.connections.values[jx].siteStandardProfileRequest.url)), 
                            cttDisplayName = theAtt.updateContent.person.connections.values[jx].firstName + " " +
                                theAtt.updateContent.person.connections.values[jx].lastName;
                                
                        content.append($("<a>")
                                    .attr("href", cttUrl)
                                    .attr("target", "_blank")
                                    .html(cttDisplayName));
                                    
                        appended = true;
                    }
                } else if (theAtt.updateType === "PROF") {                    
                    var fields = "";
                    for (var jx = 0, len_f = theAtt.updatedFields.values.length; jx < len_f; jx++) {
                        if (fields.length > 0) {
                            fields += ",";
                        }
                        fields += theAtt.updatedFields.values[jx].name.replace("person/", "");
                    }
                    if (fields.length > MOE.UI.Renderer.__maxFieldsLen) {
                        var text = fields.substring(0, MOE.UI.Renderer.__maxFieldsLen);
                        text = text.substring(0, text.lastIndexOf(","));
                        text = " has an updated profile (" + text + ",...)";
                        content.append(text);
                    } else {
                        content.append(" has an updated profile (" + fields + ")");
                    }
                } else if (theAtt.updateType === "VIRL") {
                    var subAtt = theAtt.updateContent.updateAction;
                    if (subAtt.action.code === "LIKE") {
                        content.append(" likes this update: ");
                    } else {
                        content.append(" commented on this update: ");
                    } 
                    
                    var source = "", comment = "", sourceUrl = "";
                    if (!MOE.Utils.IsUndefOrNull(subAtt.originalUpdate.updateContent.person)) {
                        source = subAtt.originalUpdate.updateContent.person.firstName + " " + 
                            subAtt.originalUpdate.updateContent.person.lastName;
                            
                        comment = subAtt.originalUpdate.updateContent.person.currentShare.comment;
                        
                        sourceUrl = subAtt.originalUpdate.updateContent.person.siteStandardProfileRequest.url;
                    } else if (!MOE.Utils.IsUndefOrNull(subAtt.originalUpdate.updateContent.company)) {
                        source = subAtt.originalUpdate.updateContent.company.name;
                        
                        comment = subAtt.originalUpdate.updateContent.companyStatusUpdate.share.comment;
                        
                        sourceUrl = "http://www.linkedin.com/company/" + subAtt.originalUpdate.updateContent.company.id;
                    }
                    
                    content
                        .append($("<a>")
                                    .attr("href", MOE.IN.Tracking.AddInfo(MOE.Utils.UnEscapeHTML(sourceUrl)))
                                    .attr("target", "_blank")
                                    .html(source))
                        .append(" ")
                        .append(MOE.Utils.ActivateURLs(comment));                    
                } else if (theAtt.updateType === "MSFC") {
                    content
                        .append(" is now following ")
                        .append($("<a>")
                                .attr("href", "http://www.linkedin.com/company/" + theAtt.updateContent.company.id)
                                .attr("target", "_blank")
                                .html(theAtt.updateContent.company.name));
                } else if (theAtt.updateType === "JGRP") {                    
                    content
                        .append(" joined the group ")
                        .append($("<a>")
                                .attr("href", MOE.Utils.UnEscapeHTML(theAtt.updateContent.person.memberGroups.values[0].siteGroupRequest.url))
                                .attr("target", "_blank")
                                .html(theAtt.updateContent.person.memberGroups.values[0].name));
                } else if (theAtt.updateType === "PREC") {
                    if (typeof theAtt.updateContent.person.recommendationsReceived !== "undefined") {
                        var recommender = theAtt.updateContent.person.recommendationsReceived.values[0].recommender.firstName + " " +
                            theAtt.updateContent.person.recommendationsReceived.values[0].recommender.lastName;
                            
                        content
                            .append(" was recommended by ")
                            .append($("<a>")
                                    .attr("href", MOE.Utils.UnEscapeHTML(theAtt.updateContent.person.recommendationsReceived.values[0].recommender.siteStandardProfileRequest.url))
                                    .attr("target", "_blank")
                                    .html(recommender))
                            .append(": " + theAtt.updateContent.person.recommendationsReceived.values[0].recommendationSnippet);
                    } else if (typeof theAtt.updateContent.person.recommendationsGiven !== "undefined") {
                        var recommendee = theAtt.updateContent.person.recommendationsGiven.values[0].recommendee.firstName + " " +
                            theAtt.updateContent.person.recommendationsGiven.values[0].recommendee.lastName;
                            
                        content
                            .append(" recommended ")
                            .append($("<a>")
                                    .attr("href", MOE.Utils.UnEscapeHTML(theAtt.updateContent.person.recommendationsGiven.values[0].recommendee.siteStandardProfileRequest.url))
                                    .attr("target", "_blank")
                                    .html(recommendee))
                            .append(": " + theAtt.updateContent.person.recommendationsGiven.values[0].recommendationSnippet);
                    }
                }
                
                if (theAtt.isLikable === true) {
                    gestures = $("<div>");
                    
                    var liked = theAtt.isLiked || false, 
                        eData = { "updateKey":theAtt.updateKey, "liked":liked, "theAtt":theAtt }; 
                    gestures.append($("<a>")
                                    .attr("href", "#")
                                    .attr("class", "act-gesture")
                                    .click(eData, function(e){
                                        MOE.IN.API.Like(e.data.updateKey, !e.data.liked, MOE.UI.Handlers.OnLike, 
                                            {"obj":this, "key":e.data.updateKey, "theAtt":e.data.theAtt});
                                    })
                                    .html((liked ? "Unlike" : "Like")));
                }
                
                if (theAtt.isCommentable === true) {
                    if (gestures !== null) {
                        gestures
                            .append($("<span>").attr("class", "act-gesture-static").html(" or "));
                    } else {
                        gestures = $("<div>");
                    }
                    gestures
                        .append($("<a>")
                                .attr("href", "http://www.linkedin.com/profile/feed?id=" + profile.id)
                                .attr("target", "_blank")
                                .attr("class", "act-gesture")
                                .html("Comment"));
                }
                
                var attyItemId = "activity-item-" + new Date().getTime(), 
                    attyItemJQId = "#" + attyItemId;
                    
                $("#in-activity-ext-info-see-more")
                    .before($("<div>")
                            .attr("class", "in-activity-item")
                            .attr("id", attyItemId)
                            .append($("<table>")
                                    .append($("<tr>").append($("<td>").append(content)))
                                    .append($("<tr>").append($("<td>").append(gestures)))));

                // this one automatically adjust to the frame height ;)
                if ($("#in-main-central").height() > $("body").height()-32) {
                    // Not enough space for this activity item!

                    $(attyItemJQId).remove();
                }
            }
        }
    },
    
    InCommon : function(incommon, total, profile, inCommonGroups, inCommonCompanies) {
        /* header */
        $("#in-common-header-pic-img").attr("src", MOE.Utils.MakeImgSecure(profile.pictureUrl));
        $("#in-common-header-info-name").html(profile.firstName + " " + profile.lastName)
                                        .prop('title', profile.firstName + " " + profile.lastName);
        $("#in-common-header-info-title").html(profile.headline);
        $("#in-common-header-info-location").html(profile.location.name + " | " + profile.industry);
        
        if (profile.distance > 0 && profile.distance < 4) {
            MOE.UI.Renderer.DistanceBadge("#in-common-distance-badge", profile.distance);
        }
        
        /* extra */
        MOE.UI.Renderer.__virtPeople.empty();
        MOE.UI.Renderer.__virtPeople.providedTotal(total);
        if (!MOE.Utils.IsEmpty(incommon)) {
            var appended = false;
                
            for (var ix = 0, len = incommon.values.length; ix < len; ix++) {
                if (appended === true) {
                    MOE.UI.Renderer.__virtPeople.add($("<div>")
                                                    .css("float", "left")
                                                    .css("display", "inline").html("&nbsp;&middot;&nbsp;")
                                                    .attr("data-status", "invalid"));
                }
                var hasURL = (typeof incommon.values[ix].publicProfileUrl !== "undefined");
                MOE.UI.Renderer.__virtPeople.add($("<div>")
                                                .css("float", "left")
                                                .css("display", "inline")
                                                .attr("data-status", "valid")
                                                .append($("<a>")
                                                        .attr("href", (hasURL === true) ? MOE.IN.Tracking.AddInfo(MOE.Utils.UnEscapeHTML(incommon.values[ix].publicProfileUrl)) : "#")
                                                        .attr("class", "in-common-profile")
                                                        .attr("target", "_blank")
                                                        .html(incommon.values[ix].firstName + " " + incommon.values[ix].lastName)));
                appended = true;
            }
            
            MOE.UI.Renderer.__virtPeople.add($("<div>")
                                            .css("float", "left")
                                            .css("display", "none")
                                            .attr("data-status", "invalid")
                                            .html("&nbsp;&middot;&nbsp;"));
                                            
            MOE.UI.Renderer.__virtPeople.add($("<div>")
                                            .attr("id", "MOETotalPeopleRemaining")
                                            .attr("data-status", "valid")
                                            .css("float", "left")
                                            .css("display", "none")
                                            .append($("<a>")
                                                    .attr("href", "http://www.linkedin.com/profile/connections?id=" + profile.id + "&tab=S")
                                                    .attr("class", "in-common-more")
                                                    .attr("target", "_blank")
                                                    .attr("id", "MOETotalPeopleRemainingLink")
                                                    .html("&nbsp;")));

            if (incommon.values.length > 0) {
                MOE.UI.Renderer.__virtPeople.initialize();
                $("#in-common-ext-row-people").show();
            } else {
                $("#in-common-ext-row-people").hide();
            }
        }
        
        /**/
        MOE.UI.Renderer.__virtGroups.empty();
        if (!MOE.Utils.IsUndefOrNull(inCommonGroups)) {
            var appended = false, leni = inCommonGroups.length;
                    
            for (var ix = 0; ix < leni; ix++) {
                if (appended === true) {
                    MOE.UI.Renderer.__virtGroups.add($("<div>")
                                                    .css("float", "left")
                                                    .css("display", "inline").html("&nbsp;&middot;&nbsp;")
                                                    .attr("data-status", "invalid"));
                }
                var hasURL = (typeof inCommonGroups[ix].group.siteGroupUrl !== "undefined");
                
                MOE.UI.Renderer.__virtGroups.add($("<div>")
                                                .css("float", "left")
                                                .css("display", "inline")
                                                .attr("data-status", "valid")
                                                .append($("<a>")
                                                        .attr("href", (hasURL === true) ? MOE.IN.Tracking.AddInfo(MOE.Utils.UnEscapeHTML(inCommonGroups[ix].group.siteGroupUrl)) : "#")
                                                        .attr("class", "in-common-company")
                                                        .attr("target", "_blank")
                                                        .html(inCommonGroups[ix].group.name)));
                appended = true;
            }
            
            MOE.UI.Renderer.__virtGroups.add($("<div>")
                                            .css("float", "left")
                                            .css("display", "none")
                                            .attr("data-status", "invalid")
                                            .html("&nbsp;&middot;&nbsp;"));
                                            
            MOE.UI.Renderer.__virtGroups.add($("<div>")
                                            .attr("id", "MOETotalGroupsRemaining")
                                            .attr("data-status", "valid")
                                            .css("float", "left")
                                            .css("display", "none")
                                            .append($("<a>")
                                                    .attr("href", "#")
                                                    .attr("class", "in-common-more")
                                                    .attr("target", "_blank")
                                                    .attr("id", "MOETotalGroupsRemainingLink")
                                                    .html("&nbsp;")));

            if (leni > 0) {
                MOE.UI.Renderer.__virtGroups.initialize();
                $("#in-common-ext-row-groups").show();
            } else {
                $("#in-common-ext-row-groups").hide();
            }
        }
        
        /**/
        MOE.UI.Renderer.__virtCompanies.empty();
        if (!MOE.Utils.IsUndefOrNull(inCommonCompanies)) {
            var appended = false, leni = inCommonCompanies.length;
                    
            for (var ix = 0; ix < leni; ix++) {
                if (appended === true) {
                    MOE.UI.Renderer.__virtCompanies.add($("<div>")
                                                    .css("float", "left")
                                                    .css("display", "inline").html("&nbsp;&middot;&nbsp;")
                                                    .attr("data-status", "invalid"));
                }
                
                MOE.UI.Renderer.__virtCompanies.add($("<div>")
                                                .css("float", "left")
                                                .css("display", "inline")
                                                .attr("data-status", "valid")
                                                .append($("<a>")
                                                        .attr("href", MOE.IN.Tracking.AddInfo(MOE.Utils.UnEscapeHTML("http://www.linkedin.com/company/" + inCommonCompanies[ix].id)))
                                                        .attr("class", "in-common-company")
                                                        .attr("target", "_blank")
                                                        .html(inCommonCompanies[ix].name)));
                appended = true;
            }
            
            MOE.UI.Renderer.__virtCompanies.add($("<div>")
                                            .css("float", "left")
                                            .css("display", "none")
                                            .attr("data-status", "invalid")
                                            .html("&nbsp;&middot;&nbsp;"));
                                            
            MOE.UI.Renderer.__virtCompanies.add($("<div>")
                                            .attr("id", "MOETotalCompaniesRemaining")
                                            .attr("data-status", "valid")
                                            .css("float", "left")
                                            .css("display", "none")
                                            .append($("<a>")
                                                    .attr("href", "#")
                                                    .attr("class", "in-common-more")
                                                    .attr("target", "_blank")
                                                    .attr("id", "MOETotalCompaniesRemainingLink")
                                                    .html("&nbsp;")));

            if (leni > 0) {
                MOE.UI.Renderer.__virtCompanies.initialize();
                $("#in-common-ext-row-companies").show();
            } else {
                $("#in-common-ext-row-companies").hide();
            }
        }
    },

    DistanceBadge : function(badgeElement, distance) {
        if (typeof distance === "undefined") return;
        var degreeDigit = $("<span>").addClass("in-network-degree-number").html(distance);
        var degreeText = $("<span>");
        switch (distance) {
            case 0:
                break;
            case 1:
                degreeText.append(degreeDigit)
                          .append($("<sup>").append("st"));
                break;
            case 2:
                degreeText.append(degreeDigit)
                          .append($("<sup>").append("nd"));
                break;
            case 3:
                degreeText.append(degreeDigit)
                          .append($("<sup>").append("rd"));
                break;
            default:
                degreeText.append(degreeDigit).append("Out of your network");
                break;
        }
        if (badgeElement !== null) {
            if (distance !== 0) {
                $(badgeElement).append(degreeText);
                $(badgeElement).show();
            }
        } else {
            return degreeText;
        }
    },
    
    ClearInCommon : function() {
        $("#in-common-ext-info-people").empty();
        $("#in-common-ext-info-groups").empty();
    },
    
    ClearAll : function() {
        MOE.UI.Renderer.__clearProfile();
        MOE.UI.Renderer.__clearInCommon();
        MOE.UI.Renderer.__clearActivity();
        MOE.UI.Renderer.__clearCompany();
    },
};

MOE.UI.Initialize = function() {
    console.log("[MOE.UI.INITIALIZE] Initializing...");
    $("#in-tabs").hide();
    MOE.UI.SignIn.Initialize();
    MOE.UI.Renderer.InitializeContent();
    console.log("[MOE.UI.INITIALIZE] Initializing... done");
};

MOE.UI.RenderAtAGlance = function(contact) {
    console.log("MOE.UI.RenderAtAGlance()...");
    MOE.UI.Renderer.__clearProfile();
    var index = MOE.UI.Renderer.__peopleBand.selectedIndex(),
        profile = contact.profile();
        
    if (profile !== null) {
        var ed = {"email":contact.email(), "index":index};
        MOE.UI.Renderer.Profile(profile, ed);
    }
    if (contact.status() === MOE.MS.Status.TO_CONFIRM) {
        $("#in-conn-to-confirm").show();
        $("#in-conn-confirmed").hide();
    } else if (contact.status() === MOE.MS.Status.CONFIRMED) {
        $("#in-conn-confirmed").show();
        $("#in-conn-to-confirm").hide();
    } else {
        $("#in-conn-to-confirm").hide();
        $("#in-conn-confirmed").hide();
    }
    MOE.UI.Loading.Hide();
    console.log("MOE.UI.RenderAtAGlance(): Done.");
};

MOE.UI.RenderInCommon = function(contact) {
    console.log("MOE.UI.RenderInCommon()...");
    MOE.UI.Renderer.__clearInCommon();
    var incomm = contact.inCommon(), incommGroups = contact.inCommonGroups(), 
        incommCompanies = contact.inCommonCompanies();
        
    if (incomm !== null || incommGroups !== null || incommCompanies !== null) {
        MOE.UI.Renderer.InCommon(incomm, (incomm !== null) ? incomm.total : 0, 
            contact.profile(), incommGroups, incommCompanies);
    }    
    console.log("MOE.UI.RenderInCommon(): Done.");
};

MOE.UI.RenderRecentActivity = function(contact) {
    console.log("MOE.UI.RenderRecentActivity()...");
    MOE.UI.Renderer.__clearActivity();
    MOE.UI.Renderer.RecentActivity(contact.activity(), contact.profile());	    
    console.log("MOE.UI.RenderRecentActivity(): Done.");
};

MOE.UI.RenderCompanyInfo = function(contact) {
    console.log("MOE.UI.RenderCompanyInfo()...");
    MOE.UI.Renderer.__clearCompany();
    MOE.UI.Renderer.Company(contact.company(), {"following":contact.company().following, "profile":contact.profile()});
    console.log("MOE.UI.RenderCompanyInfo(): Done.");
};

MOE.UI.__highlight = function(str, hlStr) {
    var retStr = "";
    if (!MOE.Utils.IsUndefOrNull(hlStr) && hlStr.length > 0) {
        var ix = str.search(new RegExp(hlStr, "i"));
        if (ix > -1) {
            var toRep = str.substr(ix, hlStr.length);
            retStr = str.replace(toRep, "<b>" + toRep + "</b>");
        }
    }
    return (!MOE.Utils.IsUndefOrNull(retStr) && retStr.length > 0) ? retStr : str;
};

MOE.UI.__highlightSearchTerms = function(str, params) {
    var retStr = str;
    if (!MOE.Utils.IsUndefOrNull(params["firstName"])) {
        retStr = MOE.UI.__highlight(retStr, params["firstName"]);
    }
    if (!MOE.Utils.IsUndefOrNull(params["lastName"])) {
        retStr = MOE.UI.__highlight(retStr, params["lastName"]);
    } 
    if (!MOE.Utils.IsUndefOrNull(params["keywords"])) {
        retStr = MOE.UI.__highlight(retStr, params["keywords"]);
    }
    if (!MOE.Utils.IsUndefOrNull(params["company"])) {
        retStr = MOE.UI.__highlight(retStr, params["company"]);
    }
    return retStr;
};

MOE.UI.__setupSearchCtrl = function(params) {    
    if (params.content.numResults > 0) {
        var isSetup = true;
        $("#in-mmatches-header-name").html("Which " + params.displayName + "?");
        $("#in-mmatches-header-email").html("No users found with that email address: " + params.email);
        $("#in-mmatches-invite-send").unbind("click");
        $("#in-mmatches-invite-send").click(function() {
            MOE.IN.API.Connect({"email":params.email, "firstName":"", "lastName":""}, function(r,e) {
                $("#in-mmatches-invite-send").hide();
                if (r.status === MOE.IN.RequestStatus.FAIL) $("#in-mmatches-invite-msg").html(r.content.message);
                else $("#in-mmatches-invite-msg").html("Invitation Sent!");
                $("#in-mmatches-invite-msg").show();
            });
        });
        MOE.IN.Events.Call("searchResultsReady", {"email":params.email});
        if (params.clearPager === true) {
            MOE.UI.Renderer.__pagenIN = new MOE.UI.Pager({
                "step" : MOE.UI.Global.SEARCH_STEP,    
                "count" : params.content.numResults,
                "updateStatus" : function(from, to, count) {
                    $("#in-mmatches-content-status").html((from + 1) + " - " + to + " of " + count);
                },    
                "updateContent" : function(from, to, count) {
                    MOE.UI.Loading.Show();
                    params["paging"] = {"start":from, "count":to - from};
                    MOE.IN.API.Search(params,
                        ["id","first-name","last-name","picture-url","headline","distance","api-standard-profile-request:(headers)"],
                        function(rr, ee) {
                            var list = $("#in-mmatches-content-list"), p = rr.content.people,
                            	lastItem = null;
                            	                                    
                            list.empty();
                            
                            var hlName = { "firstName":params["firstName"], "lastName":params["lastName"], "keywords":params["keywords"] },
                                hlCompany = { "company":params["company"], "keywords":params["keywords"] };
                            
                            if (ee.count === 1) $("#inTabs-SearchResults").hide();
                            for (var ix = 0, len = p.values.length; ix < len; ix++) {
                            
                                var text = p.values[ix].headline, dist = p.values[ix].distance;
                                
                                lastItem = $("<div>")
                                            .attr("class", "list-item")
                                            .attr("onclick", "MOE.UI.Handlers.OnSearchItem({'obj':this, 'id':'" + p.values[ix].id + "', 'ix':" + params.index + "})")
                                            .append($("<div>")
                                                    .attr("class", "pic-holder")
                                                    .append($("<img>")
                                                            .attr("class", "in-peopleband-contact-picture")
                                                            .attr("src", ((typeof p.values[ix].pictureUrl !== "undefined") ?
                                                                            MOE.Utils.MakeImgSecure(p.values[ix].pictureUrl) : MOE.UI.Renderer.__noProfilePicture))))
                                            .append($("<div>")
                                                    .attr("class", "txt-holder")
                                                    .append($("<span>")
                                                            .css("display", "inline")
                                                            .html(MOE.UI.__highlightSearchTerms(p.values[ix].firstName, hlName) + " " + 
                                                                    MOE.UI.__highlightSearchTerms(p.values[ix].lastName, hlName)))
                                                    .append($("<div>")
                                                            .css("display", "inline")
                                                            .css("margin", "0 0 0 6px")
                                                            .append($("<span>")
                                                                    .attr("class", (dist > 0 && dist < 4) ? "in-network-degree" : "")
                                                                    .html((dist > 0 && dist < 4) ? MOE.UI.Renderer.DistanceBadge(null, p.values[ix].distance) : "")))
                                                    .append("<br />")
                                                    .append($("<span>")
                                                            .attr("class", "company-holder")
                                                            .html(MOE.UI.__highlightSearchTerms(text, hlCompany))));
                                
                                list.append(lastItem);
                            }
                            
                            if (ee.count === 1) lastItem.click();
                            
                            $("#in-mmatches-invite").show();
							$("#in-tabs").fadeIn();
                            MOE.UI.Loading.Hide();
                        }, {"count":count});
                },
                "updateNavControls" : function(from, to, count) {
                    if (from === 0) {
                         $(".in-search-pointer-prev").css("border-right", "6px solid #BBBBBB");
                         $(".in-search-pointer-prev").css("cursor", "default");
                    } else {
                         $(".in-search-pointer-prev").css("border-right", "6px solid #777777");
                         $(".in-search-pointer-prev").css("cursor", "pointer");
                    }
                    
                    if ((from + MOE.UI.Global.SEARCH_STEP) < MOE.UI.Renderer.__maxSearchResults && 
                        (from + MOE.UI.Global.SEARCH_STEP) < count) {
                        $(".in-search-pointer-next").css("border-left", "6px solid #777777");
                        $(".in-search-pointer-next").css("cursor", "pointer");
                    } else {
                        $(".in-search-pointer-next").css("border-left", "6px solid #BBBBBB");
                        $(".in-search-pointer-next").css("cursor", "default");
                    }
                    
                    if (count <= MOE.UI.Global.SEARCH_STEP) {
                        $(".in-search-pointer-prev").hide();
                        $(".in-search-pointer-next").hide();
                    } else {
                        $(".in-search-pointer-prev").show();
                        $(".in-search-pointer-next").show();
                    }
                }
            });
        } else {
            isSetup = false;
            MOE.UI.Renderer.__pagenIN.update();
        }
        $("#nav-prev").unbind("click");
        $("#nav-prev").click(function(){
            MOE.UI.Renderer.__pagenIN.movePrev();
        });
        $("#nav-next").unbind("click");
        $("#nav-next").click(function(){
            MOE.UI.Renderer.__pagenIN.moveNext();
        });
        if (isSetup === true) {
            MOE.UI.Renderer.__pagenIN.moveNext();
        }
    } else {
        MOE.IN.Events.Call("displayInvite", {"email":params.email});
    }    
};

/* search company */
MOE.UI.__searchC = function(options, params, errCallback) {
    delete params["firstName"];
    delete params["lastName"];
    delete params["keywords"];
    
    // just company
    if (MOE.Utils.IsUndefOrNull(options["company"])) {
        if (typeof errCallback !== "undefined") errCallback();
    } else {
        params["company"] = options["company"];
        MOE.IN.API.Search(params, ["id"], function(r, e) {
            if (r.status === MOE.IN.RequestStatus.OK && r.content.numResults > 0) {
                if (options["contact"].email() === MOE.UI.Renderer.__peopleBand.selectedContact().email()) {
                    e["content"] = r.content;
                    MOE.UI.__setupSearchCtrl(e);
                }
            } else {
                if (typeof errCallback !== "undefined") errCallback();
            }
        }, params);
    }
};

/* search keywords */
MOE.UI.__searchK = function(options, params, errCallback) {
    delete params["firstName"];
    delete params["lastName"];
    delete params["company"];
    
    // just keywords
    if (MOE.Utils.IsUndefOrNull(options["keywords"])) {
        if (typeof errCallback !== "undefined") errCallback();
    } else {
        params["keywords"] = options["keywords"];
        MOE.IN.API.Search(params, ["id"], function(r, e) {
            if (r.status === MOE.IN.RequestStatus.OK && r.content.numResults > 0) {
                if (options["contact"].email() === MOE.UI.Renderer.__peopleBand.selectedContact().email()) {
                    e["content"] = r.content;
                    MOE.UI.__setupSearchCtrl(e);
                }
            } else {
                if (typeof errCallback !== "undefined") errCallback();
            }
        }, params);
    }
};

/* search keywords and company */
MOE.UI.__searchKC = function(options, params, errCallback) {
    delete params["firstName"];
    delete params["lastName"];
    delete params["company"];
    
    // if I don't have neither keywords nor company I'll try with other options
    if (MOE.Utils.IsUndefOrNull(options["keywords"]) || MOE.Utils.IsUndefOrNull(options["company"])) {
        if (typeof errCallback !== "undefined") errCallback();
    } else {    
        params["keywords"] = options["keywords"];
        params["company"] = options["company"];
        MOE.IN.API.Search(params, ["id"], function(r, e) {
            if (r.status === MOE.IN.RequestStatus.OK && r.content.numResults > 0) {
                if (options["contact"].email() === MOE.UI.Renderer.__peopleBand.selectedContact().email()) {
                    e["content"] = r.content;
                    MOE.UI.__setupSearchCtrl(e);
                }
            } else {
                if (typeof errCallback !== "undefined") errCallback();
            }
        }, params);
    }
};

/* search firstname and lastname */
MOE.UI.__searchFL = function(options, params, errCallback) {
    delete params["firstName"];
    delete params["lastName"];
    delete params["company"];
    
    // if I don't have first-name and last-name keep trying with other options
    if (!MOE.Utils.IsUndefOrNull(options["firstName"]) && !MOE.Utils.IsUndefOrNull(options["lastName"])) {
        params["firstName"] = options["firstName"];
        params["lastName"] = options["lastName"];
        MOE.IN.API.Search(params, ["id"], function(r, e) {
            if (r.status === MOE.IN.RequestStatus.OK && r.content.numResults > 0) {
                if (options["contact"].email() === MOE.UI.Renderer.__peopleBand.selectedContact().email()) {
                    e["content"] = r.content;
                    MOE.UI.__setupSearchCtrl(e);
                }
            } else {
                if (typeof errCallback !== "undefined") errCallback();
            }
        }, params);
    } else {
        if (typeof errCallback !== "undefined") errCallback();
    }
};

/* search firstname, lastname and company */
MOE.UI.__searchFLC = function(options, params, errCallback) {
    // if I don't have first-name, last-name and company
    // keep trying with other options
    if (!MOE.Utils.IsUndefOrNull(options["firstName"]) && 
        !MOE.Utils.IsUndefOrNull(options["lastName"]) &&
        !MOE.Utils.IsUndefOrNull(options["company"])) {
        params["firstName"] = options["firstName"];
        params["lastName"] = options["lastName"];
        params["company"] = options["company"];
        MOE.IN.API.Search(params, ["id"], function(r, e) {
            if (r.status === MOE.IN.RequestStatus.OK && r.content.numResults > 0) {
                if (options["contact"].email() === MOE.UI.Renderer.__peopleBand.selectedContact().email()) {
                    e["content"] = r.content;
                    MOE.UI.__setupSearchCtrl(e);
                }
            } else {
                if (typeof errCallback !== "undefined") errCallback();
            }
        }, params);
    } else {
        if (typeof errCallback !== "undefined") errCallback();
    }
};

MOE.UI.RenderSearch = function(clearPgr) {
    MOE.UI.Renderer.__clearSearch();
    
    var displayName = MOE.UI.Renderer.__peopleBand.selectedContact().displayName(), 
        email = MOE.UI.Renderer.__peopleBand.selectedContact().email();
        
    var params = {
        "displayName":displayName,
        "email":email,
        "index":MOE.UI.Renderer.__peopleBand.selectedIndex(),
        "clearPager":clearPgr || false,
        "paging":{"start":0, "count":1}
    };
    
    var options = { };
    
    options["contact"] = MOE.UI.Renderer.__peopleBand.selectedContact();
    
    if (typeof displayName !== "undefined") {
        displayName = MOE.Utils.Trim(MOE.Utils.Trim(displayName), "\"");
        var whiteSpaceIX = displayName.indexOf(" ");
        if (whiteSpaceIX > -1) {
            options["firstName"] = displayName.substring(0, whiteSpaceIX);
            options["lastName"] = displayName.substring(whiteSpaceIX + 1);
        }
    }
    options["keywords"] = email.substring(0, email.indexOf("@"));
    options["domain"] = email.substring(email.indexOf("@") + 1);
    
    MOE.IN.API.VerifyDomain(options["domain"], function(r, e) {
        if (r.status === MOE.IN.RequestStatus.OK && r.content._total > 0) {
            options["company"] = r.content.values[0].name;
        }
        
        MOE.UI.__searchFLC(options, params, function() {
            MOE.UI.__searchFL(options, params, function() {
                MOE.UI.__searchK(options, params, function() {
                    MOE.IN.Events.Call("displayInvite", {"email":email});
                });
            });
        });
    });    
};

MOE.UI.RenderInvite = function() {
    var edata = {
        "dn":MOE.UI.Renderer.__peopleBand.selectedContact().displayName(),
        "em":MOE.UI.Renderer.__peopleBand.selectedContact().email(),
        "ix":MOE.UI.Renderer.__peopleBand.selectedIndex()
    };
    
    $("#in-invite-send-invitation").show();
    $("#in-invite-invitation-sent").hide();
    
    $("#in-invite-email").html(edata.em);
    $("#in-invite-content-send").unbind("click");
    $("#in-invite-content-send").click(function() {
        MOE.IN.API.Connect({"email":edata.em, "firstName":"", "lastName":""}, function(r,e) {            
            if (r.status === MOE.IN.RequestStatus.FAIL){
                $("#in-invite-invitation-sent-msg").html(r.content.message);
            }
            $("#in-invite-send-invitation").hide();
            $("#in-invite-invitation-sent").show();
        });
    });
    MOE.UI.Loading.Hide();
};

MOE.UI.Handlers = {
    
    OnLike : function(res, eData) {
        if (res.status === MOE.IN.RequestStatus.OK) {
            if (typeof eData !== "undefined" && eData !== null) {
                $(eData.obj).unbind("click");
                if ($(eData.obj).html() === "Like") {
                    $(eData.obj).html("Unlike");
                    $(eData.obj).click(function () {
                        MOE.IN.API.Like(eData.key, false, MOE.UI.Handlers.OnLike, 
                            {"obj":eData.obj, "key":eData.key, "theAtt":eData.theAtt});
                    });
                    eData.theAtt.isLiked = true;
                } else {
                    $(eData.obj).html("Like");
                    $(eData.obj).click(function () {
                        MOE.IN.API.Like(eData.key, true, MOE.UI.Handlers.OnLike, 
                            {"obj":eData.obj, "key":eData.key, "theAtt":eData.theAtt});
                    });
                    eData.theAtt.isLiked = false;
                }
            }
        }
    },
    
    OnSearchItem : function(eData) {
        /* for people outside of our network only the following fields can be queried. */
        MOE.UI.Loading.Show();
        
        var fields = ["id","first-name","last-name","distance","picture-url","site-standard-profile-request","headline","industry",
                        "location:(name)","three-current-positions:(title,company:(id,name,universal-name))","api-standard-profile-request:(headers)"];
                        
        MOE.IN.API.Profile(eData.id, fields, function(r, e) {
            if (r.status === MOE.IN.RequestStatus.OK) {
                var contact = MOE.UI.Renderer.__peopleBand.getContact(eData.ix);
                contact.profile(r.content);
                contact.tag(MOE.UI.Global.USER_FOUND);
                contact.status(MOE.MS.Status.TO_CONFIRM);
                
                $("#in-conn-to-confirm-ok").unbind("click");
                $("#in-conn-to-confirm-ok").click(function() {
                    var prfApiId = contact.profile().id + "*" + contact.profile().apiStandardProfileRequest.headers.values[0].value.replace(":","*");
                    MOE.IN.API.RegisterContact(contact.email(), contact.profile().id, prfApiId, function(res, ed) {
                        ed.contact.status(MOE.MS.Status.CONFIRMED);
                        MOE.UI.Renderer.__peopleBand.updateContact(eData.ix, function(ix, profile) {
                            var cid = "in-contact-"+ix;
                            MOE.UI.Tooltip.For("#"+cid, contact.displayName());
                            if (typeof profile.pictureUrl !== "undefined" && profile.pictureUrl !== null) {
                                $("#"+cid+" img").attr("src", MOE.Utils.MakeImgSecure(profile.pictureUrl));
                            }
                            MOE.UI.Renderer.__peopleBand.selectedIndex(ix);
                        });
                    }, {"contact":contact});
                });
                
                $("#in-conn-to-confirm-back").unbind("click");
                $("#in-conn-to-confirm-back").click(function(){
                    contact.clear();
                    contact.status(MOE.MS.Status.REGULAR);
                    contact.tag(MOE.UI.Global.USER_NOT_FOUND);
                    $("#in-conn-to-confirm").hide();
                    MOE.IN.Events.Call("searchResultsReady", {"email":contact.email()});
                    MOE.UI.Renderer.__peopleBand.updateContact(eData.ix, function(ix, profile) {
                        var cid = "in-contact-"+ix;
                        MOE.UI.Tooltip.For("#"+cid, contact.email());
                        $("#"+cid+" img").attr("src",MOE.UI.Renderer.__noProfilePicture);
                    });
                });
                
                $("#in-conn-confirmed-undo").unbind("click");
                $("#in-conn-confirmed-undo").click(function() {
                    MOE.IN.API.UnregisterContact(contact.email(), function(res, ed) {
                        ed.contact.clear();
                        ed.contact.status(MOE.MS.Status.REGULAR);
                        ed.contact.tag(MOE.UI.Global.USER_NOT_FOUND);
                        $("#in-conn-confirmed").hide();
                        MOE.IN.Events.Call("searchResultsReady", {"email":ed.contact.email()});
                        MOE.UI.Renderer.__peopleBand.updateContact(eData.ix, function(ix, profile) {
                            var cid = "in-contact-"+ix;
                            MOE.UI.Tooltip.For("#"+cid, contact.email());
                            $("#"+cid+" img").attr("src",MOE.UI.Renderer.__noProfilePicture);
                        });
                    }, {"contact":contact});
                });
                
                MOE.UI.Renderer.__peopleBand.selectedIndex(eData.ix);
            }
        });
    }
};
