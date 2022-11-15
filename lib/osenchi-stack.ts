import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class OsenchiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const inputBucket = new s3.Bucket(this, 'OsenchiInputBucket', {
      bucketName: 'osenchi-inputbuchet'
    });

    const outputBucket = new s3.Bucket(this, 'OsenchiOutputBucket', {
      bucketName: 'osenchi-outputbuchet'
    });

    const emailTopic = new sns.Topic(this, 'OsenchiEmailTopic', {
      topicName: 'osenchi-topic'
    });

    const email = 'shshimamo@gmail.com';
    emailTopic.addSubscription(new subscriptions.EmailSubscription(email));

    const publishMessage = new tasks.SnsPublish(this, 'SendSuccessMail', {
      topic: emailTopic,
      subject: 'Osenchi Success',
      message: sfn.TaskInput.fromJsonPathAt('$.*'),
    });

    new sfn.StateMachine(this, 'StateMachine', {
      definition: publishMessage
    });
  }
}
