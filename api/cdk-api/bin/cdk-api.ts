#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api';
//import { FrontendStack } from '../lib/frontend';

const app = new cdk.App();

new ApiStack(app, 'ApiStack', {
    stackName: 'nFinderApi',
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
// ndt won't deploy many stacks with CDK
//new FrontendStack(app, 'FrontendStack', { stackName: 'nFinderFrontend' });
