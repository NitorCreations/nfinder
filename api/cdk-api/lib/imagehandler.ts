import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { HttpJwtAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { aws_lambda as lambda, aws_s3 as s3, aws_s3_notifications as s3_notifications } from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';


export interface ImageHandlerProps {
  bucket: s3.Bucket
}

export class ImageHandler extends Construct {
  constructor(scope: Construct, id: string, props: ImageHandlerProps) {
    super(scope, id);
    console.log('vision api key');
    console.log(process.env.VISION_API_KEY!);
    const imageHandlerFn = new NodejsFunction(
      this,
      'Lambda',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        memorySize: 1024,
        timeout: Duration.seconds(30),
        handler: 'main',
        entry: path.join(__dirname, '/../src/image-handler/index.ts'),
        environment: {
          BUCKET_NAME: props.bucket.bucketName,
          VISION_API_KEY: process.env.VISION_API_KEY!,
          VISION_API_URL: process.env.VISION_API_URL!
        },
        logRetention: RetentionDays.ONE_MONTH,
        bundling: {
          forceDockerBundling: true,
          externalModules: ['aws-sdk'],
          nodeModules: ['sharp']
        }
      },
    );
    props.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3_notifications.LambdaDestination(imageHandlerFn),
      { prefix: 'upload/' });

    props.bucket.grantRead(imageHandlerFn);
    props.bucket.grantPut(imageHandlerFn);
  }

}
