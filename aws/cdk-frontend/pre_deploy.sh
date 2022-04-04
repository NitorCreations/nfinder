#!/bin/bash

set -ex

rm -rf ../../dist

cp -R ../../ui ../../dist

CONFIG_URL=$(echo $FB_CONFIG_URL | sed "s/&/\\\&/" | sed "s/'//g")
sed -i '' -e "s|SED_APIDOMAIN_HERE|$API_DOMAIN_NAME|" ../../dist/index.html
sed -i '' -e "s|SED_FB_CONFIG_BUCKET_URL_HERE|$CONFIG_URL|" ../../dist/index.html
