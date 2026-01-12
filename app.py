#!/usr/bin/env python3
import os

import aws_cdk as cdk

from stacks.s3_stack import S3Stack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_stack import LambdaStack
from stacks.apigateway_stack import ApiGatewayStack
from stacks.frontend_stack import FrontendStack


app = cdk.App()

# Environment configuration
env = cdk.Environment(
    account=os.getenv('CDK_DEFAULT_ACCOUNT'),
    region=os.getenv('CDK_DEFAULT_REGION')
)

# Create S3 stack for image storage
s3_stack = S3Stack(app, "DrugVerificationS3Stack", env=env)

# Create DynamoDB stack for verification records
dynamodb_stack = DynamoDBStack(app, "DrugVerificationDynamoDBStack", env=env)

# Create Lambda stack with execution roles and permissions
lambda_stack = LambdaStack(
    app, 
    "DrugVerificationLambdaStack",
    image_bucket=s3_stack.image_bucket,
    verification_table=dynamodb_stack.verification_table,
    env=env
)

# Create API Gateway stack
api_stack = ApiGatewayStack(
    app, 
    "DrugVerificationApiStack",
    image_processor=lambda_stack.image_processor,
    nafdac_validator=lambda_stack.nafdac_validator,
    verification_workflow=lambda_stack.verification_workflow,
    env=env
)

# Create Frontend stack
frontend_stack = FrontendStack(
    app, 
    "DrugVerificationFrontendStack",
    api_url=api_stack.api.url,
    env=env
)

# Add dependencies
lambda_stack.add_dependency(s3_stack)
lambda_stack.add_dependency(dynamodb_stack)
api_stack.add_dependency(lambda_stack)
frontend_stack.add_dependency(api_stack)

app.synth()
