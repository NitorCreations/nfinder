import { S3Event } from "aws-lambda";
import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { CognitiveServicesCredentials } from "@azure/ms-rest-azure-js";
import { Firestore } from '@google-cloud/firestore';
import AWS = require('aws-sdk');
import { GetSecretValueResponse } from "aws-sdk/clients/secretsmanager";

const init = async () => {
    return new Promise(async (resolve, reject) => {
        console.log('Fetching config data...');
        const secrets = new AWS.SecretsManager();
        var creds: { client_email: string, private_key: string };
        try {
            const response = await secrets.getSecretValue({
                SecretId: process.env.GOOGLE_SERVICE_ACCOUNT_SECRET_NAME!
            }).promise();
            creds = JSON.parse(response.SecretString!)
        } catch (err) {
            console.error(err);
        }
        const firestore = new Firestore({
            credentials: {
                client_email: creds!.client_email,
                private_key: creds!.private_key,
            }
        });
        resolve({ firestore: firestore });
    });
};

exports.main = async (event: S3Event) => {
    init().then(async (config: any) => {
        const util = require('util');
        const sharp = require('sharp');
        const s3 = new AWS.S3()

        // Read options from the event parameter.
        console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
        const bucket = event.Records[0].s3.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
        const filename = srcKey.replace(/upload\/(.*)\//, '')
        const keyword = srcKey.match(/upload\/(.*)\//)![1];
        if (!keyword) {
            console.error(`no keyword in srcKey: ${srcKey}`)
            return;
        }
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

        // Upload the thumbnail image to the bucket
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
    })
};

async function describeImage(imageUrl: string, targetKeyword: string): Promise<VisionResult> {
    const computerVisionKey = process.env["VISION_API_KEY"]!;
    const computerVisionEndPoint = process.env["VISION_API_URL"]!;
    const cognitiveServiceCredentials = new CognitiveServicesCredentials(computerVisionKey);
    const client = new ComputerVisionClient(cognitiveServiceCredentials, computerVisionEndPoint);
    const options = {
        maxCandidates: 1,
    };

    try {
        const result = await client.describeImage(imageUrl, options)
        const caption = result.captions![0].text!
        const score = caption!.match(targetKeyword) ? result.captions![0].confidence! : 0
        return { score, caption }
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

async function addToFirestore(firestore: Firestore, visionResult: VisionResult, imageUrl: string) {
    const res = await firestore.collection('').add({
        imageUrl,
        ...visionResult,
    });
    //res.id would have the autogenerated firestore document id
}
