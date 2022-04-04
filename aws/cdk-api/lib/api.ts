import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { HttpJwtAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { aws_lambda as lambda, aws_s3 as s3 } from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { ImageHandler } from './imagehandler';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { DomainName } from '@aws-cdk/aws-apigatewayv2-alpha';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const s3Bucket = new s3.Bucket(this, id, {
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['http://localhost:8080', process.env.APP_URL!],
          allowedHeaders: ['*'],
        },
      ],
    });
    s3Bucket.grantPublicAccess('processed/*');


    const zone = HostedZone.fromLookup(this, 'DNSZone', {
      domainName: process.env.HOSTED_ZONE!
    })

    const cert = new DnsValidatedCertificate(this, 'Cert', {
      hostedZone: zone,
      domainName: process.env.API_DOMAIN_NAME!,
      cleanupRoute53Records: true,
    })

    const domainName = new DomainName(this, 'CustomDomain', {
      certificate: cert,
      domainName: process.env.API_DOMAIN_NAME!,
    })

    const httpApi = new apigwv2.HttpApi(this, 'api', {
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowCredentials: false,
        allowOrigins: ['http://localhost:8080', process.env.APP_URL!],
      },
      defaultDomainMapping: { domainName }
    });

    const dnsRecord = new ARecord(this, "AliasRecord", {
      recordName: process.env.API_DOMAIN_NAME!,
      zone: zone,
      target: RecordTarget.fromAlias(new ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId))
    })

    const getPresignedUrlFunction = new NodejsFunction(
      this,
      'get-presigned-url',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        memorySize: 1024,
        timeout: Duration.seconds(10),
        handler: 'main',
        entry: path.join(__dirname, '/../src/get-presigned-url-s3/index.ts'),
        environment: { BUCKET_NAME: s3Bucket.bucketName },
        logRetention: RetentionDays.ONE_MONTH
      },
    );

    s3Bucket.grantPut(getPresignedUrlFunction);
    s3Bucket.grantPutAcl(getPresignedUrlFunction);

    const issuer = `https://securetoken.google.com/${process.env.GOOGLE_PROJECT_ID}`;
    const authorizer = new HttpJwtAuthorizer('ApiAuthorizer', issuer, {
      jwtAudience: [process.env.GOOGLE_PROJECT_ID!],
    });
    httpApi.addRoutes({
      path: '/get-presigned-url-s3/{keyword}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('get-url-integration', getPresignedUrlFunction),
      authorizer,
    });

    const imageHandler = new ImageHandler(this, 'ImageHandler', { bucket: s3Bucket });

    new CfnOutput(this, 'apiurl', { value: httpApi.apiEndpoint })
    new CfnOutput(this, 'bucketName', { value: s3Bucket.bucketName })
  }
}
