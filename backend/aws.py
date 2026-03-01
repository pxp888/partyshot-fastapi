import base64
import datetime
import json
import logging
import os
import time

import boto3
import env2 as env
from botocore.exceptions import ClientError
from botocore.exceptions import ClientError
from botocore.config import Config
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


# CloudFront functions removed for Cloudflare R2 migration




def get_bucket_size_from_cloudwatch(bucket_name=BUCKET_NAME):
    """
    Get the bucket size using CloudWatch metrics.
    CloudWatch storage metrics are reported once a day.
    """
    # Initialize CloudWatch client
    cw = boto3.client("cloudwatch", region_name=REGION)

    # We check the last 48 hours to ensure we catch the latest data point.
    end_time = datetime.datetime.now(datetime.timezone.utc)
    start_time = end_time - datetime.timedelta(days=2)

    response = cw.get_metric_statistics(
        Namespace="AWS/S3",
        MetricName="BucketSizeBytes",
        Dimensions=[
            {"Name": "BucketName", "Value": bucket_name},
            {"Name": "StorageType", "Value": "StandardStorage"},  # Or 'AllStorageTypes'
        ],
        StartTime=start_time,
        EndTime=end_time,
        Period=86400,  # 24 hours in seconds
        Statistics=["Average"],
    )

    # Check if we got data back
    if not response["Datapoints"]:
        return "No data found. Note: CloudWatch metrics can take 24-48 hours to appear for new buckets."

    # Sort by timestamp to get the most recent point
    latest_datapoint = sorted(response["Datapoints"], key=lambda x: x["Timestamp"])[-1]

    bytes_size = latest_datapoint["Average"]
    gb_size = bytes_size / (1024**3)

    return f"Bucket: {bucket_name}\nSize: {gb_size:.2f} GB ({int(bytes_size)} bytes)"





# Final cleanup: removing manual CloudFront overrides

