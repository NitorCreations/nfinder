import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_s3 as s3,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cfo,
  aws_certificatemanager as acm,
  aws_s3_deployment as s3_deployment,
} from 'aws-cdk-lib';
import { CachePolicy, ResponseHeadersPolicy } from 'aws-cdk-lib/aws-cloudfront';

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const s3Bucket = new s3.Bucket(this, id, {
    });

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'corsHeaders', {
      corsBehavior: {
        accessControlAllowCredentials: true,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET'],
        accessControlAllowOrigins: ['*'],
        originOverride: true
      }
    });
    const distro = new cloudfront.Distribution(this, 'frontendDistro', {
      defaultBehavior: {
        origin: new cfo.S3Origin(s3Bucket),
        cachePolicy: CachePolicy.CACHING_DISABLED,
        responseHeadersPolicy
      },
      // certificate: acm.Certificate.fromCertificateArn(this, 'cert', process.env.AWS_CERTIFICATE_ARN!),
      // domainNames: [process.env.APP_DOMAIN_NAME!]
    });

    const frontendDeployment = new s3_deployment.BucketDeployment(this, 'frontendDeployment', {
      destinationBucket: s3Bucket,
      distribution: distro,
      sources: [s3_deployment.Source.asset('../../dist')]
    })

    new CfnOutput(this, 'distroDomain', {
      value: `https://${distro.distributionDomainName}`
    })
  }
}
