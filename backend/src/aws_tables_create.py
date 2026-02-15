import boto3


def create_tables():
    # Make sure this matches the region in your server.py
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

    tables_to_create = [
        {
            "TableName": "Goals",
            "KeySchema": [
                {"AttributeName": "user_id", "KeyType": "HASH"},  # Partition Key
                {"AttributeName": "goal_id", "KeyType": "RANGE"},  # Sort Key
            ],
            "AttributeDefinitions": [
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "goal_id", "AttributeType": "S"},
            ],
        },
        {
            "TableName": "Milestones",
            "KeySchema": [
                {"AttributeName": "user_id", "KeyType": "HASH"},
                {"AttributeName": "milestone_id", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "milestone_id", "AttributeType": "S"},
            ],
        },
        {
            "TableName": "Trackers",
            "KeySchema": [
                {"AttributeName": "user_id", "KeyType": "HASH"},
                {"AttributeName": "tracker_id", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "tracker_id", "AttributeType": "S"},
            ],
        },
        {
            "TableName": "Logs",
            "KeySchema": [
                {"AttributeName": "user_id", "KeyType": "HASH"},
                {
                    "AttributeName": "sk",
                    "KeyType": "RANGE",
                },  # Our composite key (tracker_id#date)
            ],
            "AttributeDefinitions": [
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "sk", "AttributeType": "S"},
            ],
        },
        {
            "TableName": "my_graph_checkpoints",
            "KeySchema": [
                {"AttributeName": "thread_id", "KeyType": "HASH"},  # Partition Key
                {"AttributeName": "checkpoint_id", "KeyType": "RANGE"},  # Sort Key
            ],
            "AttributeDefinitions": [
                {"AttributeName": "thread_id", "AttributeType": "S"},
                {"AttributeName": "checkpoint_id", "AttributeType": "S"},
            ],
        },
    ]

    for config in tables_to_create:
        try:
            print(f"Creating {config['TableName']}...")
            table = dynamodb.create_table(
                TableName=config["TableName"],
                KeySchema=config["KeySchema"],
                AttributeDefinitions=config["AttributeDefinitions"],
                BillingMode="PAY_PER_REQUEST",  # Important for Free Tier / Low Cost
            )
            table.wait_until_exists()
            print(f"✅ {config['TableName']} created successfully.")
        except Exception as e:
            if "ResourceInUseException" in str(e):
                print(f"⚠️  {config['TableName']} already exists.")
            else:
                print(f"❌ Error creating {config['TableName']}: {e}")


if __name__ == "__main__":
    create_tables()
