pref("extensions.ldapinfoshow.disabled_servers", ""); // "server1,server3"
pref("extensions.ldapinfoshow.show_display_single_pics_at", 0); // 0: right, 1: left
pref("extensions.ldapinfoshow.show_display_multi_pics_at", 0);
pref("extensions.ldapinfoshow.show_compose_single_pics_at", 0);
pref("extensions.ldapinfoshow.load_from_local_dir", false);
pref("extensions.ldapinfoshow.load_from_domain_wildcard", false);
pref("extensions.ldapinfoshow.local_pic_dir", "");
pref("extensions.ldapinfoshow.load_from_addressbook", true);
pref("extensions.ldapinfoshow.load_from_ldap", true);
pref("extensions.ldapinfoshow.ldap_batch", 36); // <= 1 will disable batch
pref("extensions.ldapinfoshow.ldap_ignore_domain", false);
pref("extensions.ldapinfoshow.load_from_intranet", true);
pref("extensions.ldapinfoshow.load_from_general", true);
pref("extensions.ldapinfoshow.load_from_facebook", false);
pref("extensions.ldapinfoshow.facebook_token", "");
pref("extensions.ldapinfoshow.facebook_token_expire", "0");
pref("extensions.ldapinfoshow.ignore_facebook_default", true);
pref("extensions.ldapinfoshow.load_from_linkedin", false);
pref("extensions.ldapinfoshow.linkedin_user", "");
pref("extensions.ldapinfoshow.linkedin_token", "");
pref("extensions.ldapinfoshow.load_from_flickr", false);
pref("extensions.ldapinfoshow.load_from_google", true);
pref("extensions.ldapinfoshow.load_from_gravatar", true);
pref("extensions.ldapinfoshow.ldap_attributes", 'cn,jpegPhoto,thumbnailPhoto,photo,telephoneNumber,pager,mobile,facsimileTelephoneNumber,mobileTelephoneNumber,pagerTelephoneNumber,physicalDeliveryOfficeName,ou,title,Reports,manager,employeeNumber,url');
pref("extensions.ldapinfoshow.filterTemplate", "(|(mail=%(email)s)(mailLocalAddress=%(email)s))");
pref("extensions.ldapinfoshow.load_from_photo_url", true);
pref("extensions.ldapinfoshow.photoURL", "http://lookup/lookup/publicphotos/%(employeeNumber)08s.jpg");
pref("extensions.ldapinfoshow.click2dial", "http://lookup/lookup/click2dial/lookup-click2dial.cgi?dialstring=%s");
pref("extensions.ldapinfoshow.intranetTemplate", "http://mysp/User Photos/Profile Pictures/%(basic.mailCompany)s_%(ldap.uid)s_LThumb.jpg");
pref("extensions.ldapinfoshow.intranetProfileTemplate", 'http://mysp/Person.aspx?accountname=%(basic.mailCompany)s\\%(ldap.uid)s');
pref("extensions.ldapinfoshow.ldapTimeoutWhenCached", 20);
pref("extensions.ldapinfoshow.ldapTimeoutInitial", 60);
pref("extensions.ldapinfoshow.ldapIdleTimeout", 300);
pref("extensions.ldapinfoshow.numberLimitSingle", 36);
pref("extensions.ldapinfoshow.numberLimitMulti", 12);
pref("extensions.ldapinfoshow.enable_verbose_info", false);
pref("extensions.ldapinfoshow.warned_about_fbli", false);
pref("extensions.ldapinfoshow.load_at_tc_header", true);
pref("extensions.ldapinfoshow.general_icon_size", 0); // 0 is tiny, 1 is small
pref("extensions.ldapinfoshow.add_margin_to_image", false);
pref("extensions.ldapinfoshow.image_height_limit_tc_header", 32);
pref("extensions.ldapinfoshow.image_height_limit_message_display_size_divide", 8);
pref("extensions.ldapinfoshow.image_height_limit_message_display_many", 48);
pref("extensions.ldapinfoshow.image_height_limit_message_display_few", 64);
pref("extensions.ldapinfoshow.image_height_limit_compose", 128);
pref("extensions.ldapinfoshow.image_height_limit_popup", 128);
pref("extensions.ldapinfoshow.service_priority", 'local_dir>addressbook>ldap>intranet>facebook>linkedin>flickr>google>gravatar>domain_wildcard');
