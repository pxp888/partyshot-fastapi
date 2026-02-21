import base64
import datetime
import json
import logging
import os
import time

import boto3
import env
from botocore.exceptions import ClientError
from botocore.signers import CloudFrontSigner
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

"""AWS S3 functions"""

BUCKET_NAME = env.BUCKET_NAME
REGION = env.REGION


def get_s3_client():
    """Helper to maintain consistency across functions"""
    return boto3.client("s3", region_name=REGION)


def upload_bytes_to_s3(bytes_data, object_name):
    s3_client = get_s3_client()
    try:
        s3_client.put_object(Body=bytes_data, Bucket=BUCKET_NAME, Key=object_name)
    except ClientError as e:
        logging.error("Error uploading bytes: %s", e)
        return False
    return True


def create_presigned_url(object_name, expiration=86400):
    """
    Generate a presigned URL to SHARE/VIEW an object.
    :param expiration: Time in seconds (default 1 hour)
    """
    if object_name is None:
        return None
    s3_client = get_s3_client()
    try:
        response = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": object_name},
            ExpiresIn=expiration,
        )
    except ClientError as e:
        logging.error("Error generating presigned GET URL: %s", e)
        return None
    return response


def create_presigned_post(object_name, expiration=3600):
    """
    Generate a presigned URL to UPLOAD a file via POST.
    Useful for frontend uploads directly to S3.
    """
    s3_client = get_s3_client()
    try:
        response = s3_client.generate_presigned_post(
            Bucket=BUCKET_NAME, Key=object_name, ExpiresIn=expiration
        )
    except ClientError as e:
        logging.error("Error generating presigned POST URL: %s", e)
        return None
    return response


def delete_file_from_s3(object_name):
    if object_name is None:
        return False
    s3_client = get_s3_client()
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=object_name)
        logging.info("Deleted %s from S3 bucket %s", object_name, BUCKET_NAME)
    except ClientError as e:
        logging.error("Error deleting file: %s", e)
        return False
    return True


def s3size(key):
    if key is None:
        return 0
    s3_client = get_s3_client()
    try:
        response = s3_client.head_object(Bucket=BUCKET_NAME, Key=key)
        return response.get("ContentLength", 0)
    except ClientError as e:
        logging.error("Error getting s3 size for %s: %s", key, e)
        return 0


def rsa_signer(message):
    """Signer for CloudFront URLs using the private key from environment"""
    try:
        private_key = serialization.load_pem_private_key(
            env.CLOUDFRONT_PRIVATE_KEY.encode(),
            password=None,
            backend=default_backend(),
        )
        return private_key.sign(message, padding.PKCS1v15(), hashes.SHA1())
    except Exception as e:
        logging.error("Error signing CloudFront message: %s", e)
        raise


def create_cloudfront_signed_url(object_name, expiration=86400):
    """
    Generate a CloudFront signed URL to SHARE/VIEW an object.
    :param expiration: Seconds until the URL expires (default 24h)
    """
    if not object_name:
        return None

    try:
        # Construct the full URL for the resource
        url = f"https://{env.CLOUDFRONT_DOMAIN}/{object_name}"

        # Calculate expiry time
        expire_date = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            seconds=expiration
        )

        # Initialize the CloudFront signer
        signer = CloudFrontSigner(env.CLOUDFRONT_KEY_ID, rsa_signer)

        # Generate the signed URL (using a canned policy / date_less_than)
        signed_url = signer.generate_presigned_url(url, date_less_than=expire_date)
        return signed_url
    except Exception as e:
        logging.error(
            "Error generating CloudFront signed URL for %s: %s", object_name, e
        )
        return None


def get_cloudfront_url(object_name):
    """
    Construct a plain CloudFront URL for an object.
    The browser must have valid signed cookies to access this.
    """
    if not object_name:
        return None
    return f"https://{env.CLOUDFRONT_DOMAIN}/{object_name}"


def get_cloudfront_signed_cookies(resource_url, expiration=86400):
    try:
        expire_time = int(time.time() + expiration)

        # 1. Build policy with NO whitespace
        policy = {
            "Statement": [
                {
                    "Resource": resource_url,
                    "Condition": {"DateLessThan": {"AWS:EpochTime": expire_time}},
                }
            ]
        }
        # Explicitly remove all whitespace
        policy_json = json.dumps(policy, separators=(",", ":"))

        # 2. Helper for CloudFront's specific Base64 requirements
        def cf_base64_encode(data_bytes):
            return (
                base64.b64encode(data_bytes)
                .decode("utf-8")
                .replace("+", "-")
                .replace("=", "_")
                .replace("/", "~")
            )

        # 3. Encode Policy
        policy_64 = cf_base64_encode(policy_json.encode("utf-8"))

        # 4. Sign the EXACT SAME string used for encoding
        signature_binary = rsa_signer(policy_json.encode("utf-8"))
        signature_64 = cf_base64_encode(signature_binary)

        return {
            "CloudFront-Policy": policy_64,
            "CloudFront-Signature": signature_64,
            "CloudFront-Key-Pair-Id": env.CLOUDFRONT_KEY_ID,
        }
    except Exception as e:
        print(f"Error: {e}")
        return None


if env.LOCALDEV == "True":
    get_cloudfront_url = create_cloudfront_signed_url
