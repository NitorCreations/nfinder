#!/bin/bash
set -xe

ndt deploy-azure vision vision
export VISION_API_KEY=$(az deployment group show -g ndtmain-vision-vision -n ndtmain_vision_vision --query properties.outputs.visionApiKey.value -o tsv)

ndt deploy-terraform firestore firestore

#This deployment needs VISION_KEY
ndt deploy-cdk api api
