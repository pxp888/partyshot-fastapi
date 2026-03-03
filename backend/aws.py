import base64
import datetime
import json
import logging
import os
import time

import boto3
import env
from botocore.config import Config
from botocore.exceptions import ClientError

# Removed CloudFront and Cryptography imports as they are no longer needed for R2


"""AWS S3 functions"""

BUCKET_NAME = env.R2_BUCKET_NAME


def get_s3_client():
    """Helper for Cloudflare R2"""
    return boto3.client(
        "s3",
        endpoint_url=env.R2_ENDPOINT_URL,
        aws_access_key_id=env.R2_ACCESS_KEY_ID,
        aws_secret_access_key=env.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


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
    return f"https://media.shareshot.eu/{object_name}"

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


def delete_files_from_s3(keys):
    s3_client = get_s3_client()
    objects = [{"Key": key} for key in keys if key]
    if not objects:
        return True
    try:
        response = s3_client.delete_objects(
            Bucket=BUCKET_NAME, Delete={"Objects": objects}
        )
        deleted = response.get("Deleted", [])
        errors = response.get("Errors", [])
        logging.info("Deleted %s objects from S3. Errors: %s", len(deleted), errors)
        return len(errors) == 0
    except ClientError as e:
        logging.error("Error deleting files: %s", e)
        return False
