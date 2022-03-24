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

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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
        allowCredentials: true,
        allowOrigins: [process.env.APP_URL!],
      },
    });

    const s3Bucket = new s3.Bucket(this, id, {
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: [process.env.APP_URL!],
          allowedHeaders: ['*'],
        },
      ],
    });

    s3Bucket.grantPublicAccess('processed/*');


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

    const issuer = 'https://accounts.google.com';
    const authorizer = new HttpJwtAuthorizer('ApiAuthorizer', issuer, {
      jwtAudience: [process.env.CLIENT_ID!],
    });
    httpApi.addRoutes({
      path: '/get-presigned-url-s3/{keyword}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('get-url-integration', getPresignedUrlFunction),
      authorizer
    });

    const imageHandler = new ImageHandler(this, 'ImageHandler', { bucket: s3Bucket });

    new CfnOutput(this, 'apiurl', { value: httpApi.apiEndpoint })
  }
}
