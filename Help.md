# Introduction #
Awesome ldapInfoShow is a Thunderbird addon that show contact photo and other info from LDAP for intranet, search avatar in social networks like Facebook, LinkedIn, Flickr, Google+, Gravatar from internet

# LinkedIn Support #
  1. First need to enable it in Option, and click 'OK' for the warning confirmation. ![https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/confirm.png](https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/confirm.png)
  1. Then It will ask for LinkedIn password through standard dialog. ![https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/password.png](https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/password.png)
  1. At last You need to confirm and add the certificate used by LinkedIn to TB's exceptions. ![https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/certificate_warn.png](https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/certificate_warn.png) ![https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/certificate.png](https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/certificate.png)

# Performance #
  1. The more places you enabled, it take more time to load
  1. Flickr/Gravar can only query 1 email at a time, and Flickr server is slow.
  1. Facebook/LinkedIn/LDAP support batch query and it can save overall query time, but takes more time to load the 1st one.
  1. Facebook/LinkedIn will query 25 emails at most in one query.
  1. LDAP batch query limit is configurable in option dialog and only works when your query filter is simple, eg '(|(mail=%(email)s)(mailLocalAddress=%(email)s))'
  1. You can also limit the total number of email addresses queried for one mail.
![https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/limitations.png](https://github.com/wangvisual/ldapinfo/blob/master/wiki_images/limitations.png)

# Privacy #
  1. The email addresses sent to Facebook/LinkedIn/Gravatar will be hashed first.
  1. Flickr uses plain email address but transfer through https.
  1. LDAP search uses plain email address.
  1. Facebook/LinkedIn support are using Microsoft Outlook Connectors way of searching, so you will see the authorization to MOC in your Facebook/LinkedIn settings.

# Future #
  1. Support Twitter? If anyone can tell me how.
  1. Xing? Maybe.
  1. Support X-Face/Face header? No, they're obsolete.

# Tips #
  1. You can try to install addon that can sync your gmail contact to local address-book and config this addon to load avatar from it.
