#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkFrontendStack } from '../lib/cdk-frontend-stack';

const app = new cdk.App();
new CdkFrontendStack(app, 'CdkFrontendStack', {
  stackName: 'nFinderFrontend',
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});