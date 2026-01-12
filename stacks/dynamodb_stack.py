from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_dynamodb as dynamodb,
)
from constructs import Construct

class DynamoDBStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # DynamoDB table for verification records
        self.verification_table = dynamodb.Table(
            self, "VerificationTable",
            partition_key=dynamodb.Attribute(
                name="verificationId",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
            point_in_time_recovery=True,
            time_to_live_attribute="ttl"
        )
        
        # Add GSI for querying by NAFDAC number
        self.verification_table.add_global_secondary_index(
            index_name="NafdacNumberIndex",
            partition_key=dynamodb.Attribute(
                name="nafdacNumber",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING
            )
        )