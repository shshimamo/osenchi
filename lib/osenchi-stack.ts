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
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class OsenchiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * 5.3 入出力バケットの作成
     */
    const inputBucket = new s3.Bucket(this, 'OsenchiInputBucket', {
      bucketName: 'osenchi-inputbucket--shshimamo'
    });

    const outputBucket = new s3.Bucket(this, 'OsenchiOutputBucket', {
      bucketName: 'osenchi-outputbucket--shshimamo'
    });

    /**
     * 5.4 メール通知の実装
     */
    const emailTopic = new sns.Topic(this, 'OsenchiEmailTopic', {
      topicName: 'osenchi-topic--shshimamo'
    });

    const email = 'shshimamo@gmail.com';
    emailTopic.addSubscription(new subscriptions.EmailSubscription(email));

    /**
     * 5.5 ワークフローの作成
     */
    const successTask = new tasks.SnsPublish(this, 'SendSuccessMail', {
      topic: emailTopic,
      message: sfn.TaskInput.fromJsonPathAt('$.*'),
      subject: 'Osenchi Success',
    });

    /**
     * 5.6 入力バケットとワークフロー連携
     */
    const logBucket = new s3.Bucket(this, 'OsenchiLogBucket', {
      bucketName: 'osenchi-logbucket--shshimamo'
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


    /**
     * 5.7 タスクの作成
     */

    const detectionFunc = new NodejsFunction(this, 'DetectionFunc', {
      functionName: 'osenchi-detect-sentiment',
      entry: path.join(__dirname, `/../functions/detect-sentiment/index.ts`),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.minutes(5),
      environment: {
        DEST_BUCKET: outputBucket.bucketName,
      },
    });

    const deletionFunc = new NodejsFunction(this, 'DeletionFunc', {
      functionName: 'osenchi-delete-object',
      entry: path.join(__dirname, `/../functions/delete-object/index.ts`),
      handler: 'handler',
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

    inputBucket.grantDelete(deletionFunc);

    /**
     * 5.8 ワークフロー
     */
    const sentimentTask = new tasks.LambdaInvoke(this, 'DetectSentiment', {
      lambdaFunction: detectionFunc,
    });
    const deleteTask = new tasks.LambdaInvoke(this, 'DeleteObject', {
      lambdaFunction: deletionFunc,
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
