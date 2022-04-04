import { Stack, StackProps } from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Frontend } from './frontend';

export class CdkFrontendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const zone = HostedZone.fromLookup(this, 'DNSZone', {
      domainName: process.env.HOSTED_ZONE!
    })
    new Frontend(this, 'Frontend', { zone });
  }
}
