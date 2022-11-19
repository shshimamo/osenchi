import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

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

    const logBucket = new s3.Bucket(this, 'OsenchiLogBucket', {
      bucketName: 'osenchi-logbucket-123'
    });

    const trail = new cloudtrail.Trail(this, 'Trail', {
      bucket: logBucket,
      isMultiRegionTrail: false
    });

    const s3EventSelector: cloudtrail.S3EventSelector = {
      bucket: inputBucket,
    };

    trail.addS3EventSelector([s3EventSelector], {
      readWriteType: cloudtrail.ReadWriteType.WRITE_ONLY
    });

    // イベントルール(CloudWatch Events)
    const rule = new events.Rule(this, 'EventRule', {
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['AWS API Call via CloudTrail'],
        detail: {
          'eventSource': ['s3.amazonaws.com'],
          'eventName': ['PutObject'],
            'requestParameters': {
                'bucketName': [inputBucket.bucketName]
            }
        }
      }
    });

    const detectionFunc = new lambda.Function(this, 'DetectionFunc', {
      functionName: 'osenchi-detect-sentiment',
      code: lambda.Code.fromAsset('functions/detect-sentiment', {
        exclude: ['*.ts'],
      }),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.minutes(5),
      environment: {
        DEST_BUCKET: outputBucket.bucketName,
      },
    });

    const deletionFunc = new lambda.Function(this, 'DeletionFunc', {
      functionName: 'osenchi-delete-object',
      code: lambda.Code.fromAsset('functions/delete-object', {
        exclude: ['*.ts'],
      }),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
    });

    inputBucket.grantRead(detectionFunc);
    outputBucket.grantWrite(detectionFunc);
    const policy = new iam.PolicyStatement({
      resources: ['*'],
      actions: ['comprehend:BatchDetectSentiment'],
    });
    // ポリシー追加
    detectionFunc.addToRolePolicy(policy);

    inputBucket.grantRead(deletionFunc);

    const sentimentTask = new tasks.LambdaInvoke(this, 'DetectSentiment', {
      lambdaFunction: detectionFunc,
    });
    const deleteTask = new tasks.LambdaInvoke(this, 'DeleteObject', {
      lambdaFunction: deletionFunc,
    });
    const successTask = new tasks.SnsPublish(this, 'SendSuccessMail', {
      topic: emailTopic,
      message: sfn.TaskInput.fromJsonPathAt('$.*'),
      subject: 'Osenchi Success',
    });
    const errorTask = new tasks.SnsPublish(this, 'SendErrorMail', {
      topic: emailTopic,
      message: sfn.TaskInput.fromJsonPathAt('$.*'),
      subject: 'Osenchi Error',
    });

    const mainFlow = sentimentTask.next(deleteTask).next(successTask);
    const parallel = new sfn.Parallel(this, 'Parallel');
    parallel.branch(mainFlow);
    parallel.addCatch(errorTask, { resultPath: '$.error' });

    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definition: parallel,
      timeout: cdk.Duration.minutes(30),
    });
    // イベントターゲットとしてステートマシンを指定
    const tartget = new targets.SfnStateMachine(stateMachine)
    rule.addTarget(tartget);

  }
}
