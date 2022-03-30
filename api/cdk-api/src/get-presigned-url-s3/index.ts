import { APIGatewayEvent } from "aws-lambda";
const { randomUUID } = require('crypto');

exports.main = async (event: APIGatewayEvent) => {

    const fileTypeMap: any = {
        'image/jpeg': 'jpg',
        'image/png': 'png'
    }

    const AWS = require('aws-sdk')

    const s3 = new AWS.S3()

    const myBucket = process.env.BUCKET_NAME
    const keyword = event.pathParameters!.keyword!
    const contentType = event.queryStringParameters!.contentType!
    const uuid = randomUUID()
    const myKey = `upload/${keyword}/${uuid}.${fileTypeMap[contentType]!}`
    const signedUrlExpireSeconds = 60 * 5

    const url = s3.getSignedUrl('putObject', {
        Bucket: myBucket,
        Key: myKey,
        Expires: signedUrlExpireSeconds,
        ContentType: contentType,
    })

    console.log(url)

    return { imagePostUrl: url, imageUuid: uuid };
};
