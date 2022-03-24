import { APIGatewayEvent } from "aws-lambda";
const { randomUUID } = require('crypto');

exports.main = async (event: APIGatewayEvent) => {

    const AWS = require('aws-sdk')

    const s3 = new AWS.S3()

    const myBucket = process.env.BUCKET_NAME
    const keyword = event.pathParameters!.keyword!
    const myKey = `upload/${keyword}/${randomUUID()}.jpg`
    const signedUrlExpireSeconds = 60 * 5

    const url = s3.getSignedUrl('putObject', {
        Bucket: myBucket,
        Key: myKey,
        Expires: signedUrlExpireSeconds
    })

    console.log(url)

    return { imagePostUrl: url };
};
