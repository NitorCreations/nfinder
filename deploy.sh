#!/bin/bash
set -x

ndt deploy-azure vision vision
export VISION_API_KEY=$(az deployment group show -g ndtmaster-vision-vision -n ndtmaster_vision_vision --query properties.outputs.visionApiKey.value -o tsv)

ndt deploy-terraform firestore firestore

#This deployment needs VISION_KEY
ndt deploy-cdk api api

#ndt deploy-cdk frontend frontend
