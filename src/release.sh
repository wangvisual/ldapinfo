#!/bin/sh
version=`sed -n -e "s/.*<em:version>\(.*\)<\/em:version>/\1/p" install.rdf`
zip -r ldapinfo-$version-tb.xpi * -x \*.git \*.xpi \*.sh \*.bat

