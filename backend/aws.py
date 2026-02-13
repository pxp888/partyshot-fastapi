import os

import boto3
import env
from botocore.exceptions import ClientError

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
        print(f"Error uploading bytes: {e}")
        return False
    return True


def create_presigned_url(object_name, expiration=3600):
    """
    Generate a presigned URL to SHARE/VIEW an object.
    :param expiration: Time in seconds (default 1 hour)
    """
    s3_client = get_s3_client()
    try:
        response = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": object_name},
            ExpiresIn=expiration,
        )
    except ClientError as e:
        print(f"Error generating presigned GET URL: {e}")
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
        print(f"Error generating presigned POST URL: {e}")
        return None
    return response


def delete_file_from_s3(object_name):
    s3_client = get_s3_client()
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=object_name)
        print(f"Deleted {object_name} from S3 bucket {BUCKET_NAME}")
    except ClientError as e:
        print(f"Error deleting file: {e}")
        return False
    return True
