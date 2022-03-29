import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_lambda as lambda, aws_s3 as s3, aws_s3_notifications as s3_notifications } from 'aws-cdk-lib';
import { CachePolicy, PriceClass, ResponseHeadersPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import {
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cfo,
  aws_certificatemanager as acm,
  aws_s3_deployment as s3_deployment,
} from 'aws-cdk-lib';
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';

export interface FrontendProps {
  bucket: s3.Bucket
  zone: IHostedZone
}

export class Frontend extends Construct {
  readonly distro: cloudfront.Distribution

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);
    const cert = new DnsValidatedCertificate(this, 'Cert', {
      hostedZone: props.zone,
      domainName: process.env.APP_DOMAIN_NAME!,
      cleanupRoute53Records: true,
      region: 'us-east-1'
    })

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'corsHeaders', {
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET'],
        accessControlAllowOrigins: ['*'],
        originOverride: true
      }
    });
    this.distro = new cloudfront.Distribution(this, 'frontendDistro', {
      defaultBehavior: {
        origin: new cfo.S3Origin(props.bucket, {
          originPath: '/frontend'
        }),
        cachePolicy: CachePolicy.CACHING_DISABLED,
        responseHeadersPolicy,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [{
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      }, {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      }],
      defaultRootObject: 'index.html',
      domainNames: [process.env.APP_DOMAIN_NAME!],
      certificate: cert,
      priceClass: PriceClass.PRICE_CLASS_100
      // certificate: acm.Certificate.fromCertificateArn(this, 'cert', process.env.AWS_CERTIFICATE_ARN!),
      // domainNames: [process.env.APP_DOMAIN_NAME!]
    });
    const dnsRecord = new ARecord(this, "AliasRecord", {
      recordName: process.env.APP_DOMAIN_NAME!,
      zone: props.zone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distro))
    })

    const frontendDeployment = new s3_deployment.BucketDeployment(this, 'frontendDeployment', {
      destinationBucket: props.bucket,
      destinationKeyPrefix: 'frontend/',
      //distribution: this.distro,
      sources: [s3_deployment.Source.asset('../../ui')],
    })

    new CfnOutput(this, 'distroDomain', {
      value: `https://${this.distro.distributionDomainName}`
    })
  }

}
