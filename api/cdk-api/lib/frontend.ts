import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_lambda as lambda, aws_s3 as s3, aws_s3_notifications as s3_notifications } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { CachePolicy, ResponseHeadersPolicy } from 'aws-cdk-lib/aws-cloudfront';
import {
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cfo,
  aws_certificatemanager as acm,
  aws_s3_deployment as s3_deployment,
} from 'aws-cdk-lib';

export interface FrontendProps {
  bucket: s3.Bucket
}

export class Frontend extends Construct {
  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);
    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'corsHeaders', {
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET'],
        accessControlAllowOrigins: ['*'],
        originOverride: true
      }
    });
    const distro = new cloudfront.Distribution(this, 'frontendDistro', {
      defaultBehavior: {
        origin: new cfo.S3Origin(props.bucket, {
          originPath: '/frontend'
        }),
        cachePolicy: CachePolicy.CACHING_DISABLED,
        responseHeadersPolicy,
      },
      defaultRootObject: 'index.html',
      // certificate: acm.Certificate.fromCertificateArn(this, 'cert', process.env.AWS_CERTIFICATE_ARN!),
      // domainNames: [process.env.APP_DOMAIN_NAME!]
    });

    const frontendDeployment = new s3_deployment.BucketDeployment(this, 'frontendDeployment', {
      destinationBucket: props.bucket,
      destinationKeyPrefix: 'frontend/',
      distribution: distro,
      sources: [s3_deployment.Source.asset('../../dist')],
    })

    new CfnOutput(this, 'distroDomain', {
      value: `https://${distro.distributionDomainName}`
    })
  }

}
