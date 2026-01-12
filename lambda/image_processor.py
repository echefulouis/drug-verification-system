import json
import base64
import boto3
import os
import re
from datetime import datetime
import uuid
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()

s3_client = boto3.client('s3')
textract_client = boto3.client('textract')
bedrock_client = boto3.client('bedrock-runtime')

IMAGE_BUCKET = os.environ['IMAGE_BUCKET_NAME']


def store_image_in_s3(image_data: bytes, verification_id: str, timestamp: str) -> str:
    """Store image in S3 and return the key"""
    filename = f"{timestamp}_{verification_id}.jpg"
    s3_key = f"images/{filename}"
    
    s3_client.put_object(
        Bucket=IMAGE_BUCKET,
        Key=s3_key,
        Body=image_data,
        ContentType='image/jpeg'
    )
    
    logger.info(f"Image stored in S3: {s3_key}")
    return s3_key


def extract_product_name_with_bedrock(image_data: bytes) -> str:
    """Use AWS Bedrock (Claude) to extract product name from image"""
    try:
        logger.info("Using Bedrock to extract product name")
        
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 50,
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": "Extract only the drug name from this pharmaceutical product. Return just the name, nothing else. Keep hyphens if present."
                    }
                ]
            }]
        }
        
        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        product_name = response_body['content'][0]['text'].strip().strip('"\'').split('\n')[0]
        
        logger.info(f"Extracted product name: {product_name}")
        return product_name if product_name else None
        
    except Exception as e:
        logger.error(f"Bedrock extraction failed: {str(e)}")
        return None


def extract_nafdac_number_ocr(s3_key: str, image_data: bytes = None) -> dict:
    """Extract NAFDAC number from image using AWS Textract"""
    try:
        logger.info(f"Starting OCR extraction for {s3_key}")
        
        response = textract_client.detect_document_text(
            Document={'S3Object': {'Bucket': IMAGE_BUCKET, 'Name': s3_key}}
        )
        
        all_text = []
        nafdac_candidates = []
        
        for block in response.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                text = block.get('Text', '')
                confidence = block.get('Confidence', 0)
                all_text.append(text)
                
                nafdac_patterns = [
                    r'[A-Z]\d{1,2}-\d{4,6}',
                    r'\d{2}-\d{4,6}',
                    r'NAFDAC[:\s]*([A-Z0-9-]+)',
                    r'REG[:\s]*([A-Z0-9-]+)',
                    r'NRN[:\s]*([A-Z0-9-]+)',
                ]
                
                for pattern in nafdac_patterns:
                    for match in re.finditer(pattern, text, re.IGNORECASE):
                        nafdac_num = (match.group(1) if match.lastindex else match.group(0)).strip().upper()
                        nafdac_num = re.sub(r'^(NAFDAC|REG|NRN)[:\s]*', '', nafdac_num, flags=re.IGNORECASE)
                        nafdac_candidates.append({'number': nafdac_num, 'confidence': confidence})
                        logger.info(f"Found NAFDAC: {nafdac_num} ({confidence}%)")
        
        full_text = ' '.join(all_text)
        logger.info(f"Extracted text: {full_text[:200]}...")
        
        if nafdac_candidates:
            best = max(nafdac_candidates, key=lambda x: x['confidence'])
            logger.info(f"Selected NAFDAC: {best['number']} ({best['confidence']}%)")
            return {
                'nafdacNumber': best['number'],
                'confidence': best['confidence'],
                'allText': full_text,
                'productName': None
            }
        
        # No NAFDAC found - use Bedrock for product name
        logger.warning("No NAFDAC found, using Bedrock")
        product_name = extract_product_name_with_bedrock(image_data) if image_data else None
        
        return {
            'nafdacNumber': None,
            'confidence': None,
            'allText': full_text,
            'productName': product_name
        }
            
    except Exception as e:
        logger.error(f"OCR failed: {str(e)}")
        return {'nafdacNumber': None, 'confidence': None, 'allText': '', 'productName': None}


@logger.inject_lambda_context
def handler(event: dict, context: LambdaContext) -> dict:
    """
    Image Processing Lambda Handler
    
    Accepts base64 encoded image, stores in S3, and extracts NAFDAC number via OCR
    
    Input:
    {
        "image": "base64_encoded_image_data",
        "nafdacNumber": "optional_manual_nafdac_number"
    }
    
    Output:
    {
        "verificationId": "uuid",
        "timestamp": "ISO8601_timestamp",
        "imageKey": "s3_key",
        "nafdacNumber": "extracted_or_manual_number"
    }
    """
    try:
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        # Generate verification ID and timestamp
        verification_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Decode base64 image
        image_base64 = body.get('image', '')
        if not image_base64:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing image data'})
            }
        
        # Remove data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        image_data = base64.b64decode(image_base64)
        
        # Store image in S3
        s3_key = store_image_in_s3(image_data, verification_id, timestamp)
        
        # Extract NAFDAC number or product name
        ocr_result = extract_nafdac_number_ocr(s3_key, image_data) if not body.get('nafdacNumber') else {
            'nafdacNumber': body.get('nafdacNumber'),
            'confidence': None,
            'allText': None,
            'productName': None
        }
        
        logger.info(f"Processed: ID={verification_id}, NAFDAC={ocr_result.get('nafdacNumber')}, Product={ocr_result.get('productName')}")
        
        response = {
            'verificationId': verification_id,
            'timestamp': timestamp,
            'imageKey': s3_key,
            'nafdacNumber': ocr_result.get('nafdacNumber'),
            'productName': ocr_result.get('productName'),
            'ocrConfidence': ocr_result.get('confidence'),
            'extractedText': ocr_result.get('allText')
        }
        
        result = {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response)
        }
        
        logger.info(f"Returning response: {json.dumps(result)}")
        return result
        
    except Exception as e:
        logger.exception("Error processing image")
        error_result = {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
        logger.error(f"Returning error response: {json.dumps(error_result)}")
        return error_result
