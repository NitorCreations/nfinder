#!/bin/bash
set -xe

ndt deploy-azure vision vision

ndt deploy-terraform firebase firebase

ndt deploy-cdk aws api

ndt deploy-cdk aws frontend
