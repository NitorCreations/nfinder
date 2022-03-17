import { S3Event } from "aws-lambda";
const { ComputerVisionClient } = require("@azure/cognitiveservices-computervision");
const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");

exports.main = async (event: S3Event) => {

    const AWS = require('aws-sdk')
    const util = require('util');
    const sharp = require('sharp');
    const s3 = new AWS.S3()

    // Read options from the event parameter.
    console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
    const bucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const filename = srcKey.replace('upload/', '')
    const dstKey = "processed/" + filename;

    // Infer the image type from the file suffix.
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.log("Could not determine the image type.");
        return;
    }

    // Check that the image type is supported
    const imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "png") {
        console.log(`Unsupported image type: ${imageType}`);
        return;
    }

    // Download the image from the S3 source bucket.

    try {
        const params = {
            Bucket: bucket,
            Key: srcKey
        };
        var origimage = await s3.getObject(params).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
    const width = 400;

    try {
        var buffer = await sharp(origimage.Body).resize(width).toBuffer();

    } catch (error) {
        console.log(error);
        return;
    }

    // Upload the thumbnail image to the destination bucket
    try {
        const destparams = {
            Bucket: bucket,
            Key: dstKey,
            Body: buffer,
            ContentType: "image"
        };

        const putResult = await s3.putObject(destparams).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    console.log('Successfully resized ' + bucket + '/' + srcKey +
        ' and uploaded to ' + bucket + '/' + dstKey);

    const urlForVision = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: srcKey,
        Expires: 60
    })

    const visionResult = await describeImage(urlForVision, 'goat');

    console.log('got visionresult:');
    console.log(visionResult);
};

async function describeImage(imageUrl: string, targetKeyword: string): Promise<VisionResult> {
    const computerVisionKey = process.env["VISION_API_KEY"]!;
    const computerVisionEndPoint = process.env["VISION_API_URL"]!;
    const cognitiveServiceCredentials = new CognitiveServicesCredentials(computerVisionKey);
    const client = new ComputerVisionClient(cognitiveServiceCredentials, computerVisionEndPoint);
    const options = {
        maxCandidates: 1,
        language: "en"
    };

    try {
        const result = await client.describeImage(imageUrl, options)
        return { score: result.captions[0].confidence, caption: result.captions[0].text }
    } catch (err: any) {
        console.log("An error occurred with vision api:");
        console.error(err);
        throw err
    }
}

type VisionResult = {
    score: number,
    caption: string,
}