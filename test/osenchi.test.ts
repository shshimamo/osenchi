import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions";
import { CoreProps } from '../lib/core/core-props';
import { CoreStack, ICoreProps } from '../lib/core/core-stack';
import { Context } from '../lib/common/context';

beforeAll(() => {
    Context.setEnvironment();
});

describe('Osenchi Snapshot tests', () => {
    test('Snapshot tests', () => {
        const app = new cdk.App();
        const props = CoreProps.fromContext(app.node);
        const stack = new CoreStack(app, 'Osenchi-Core', props);
        // スタックからテンプレート(JSON)を生成
        const template = Template.fromStack(stack).toJSON();
        expect(template).toMatchSnapshot();
    });
});

describe('Osenchi Fine-grained assertions tests', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let coreProps: ICoreProps;
    let template: Template;
    beforeEach(() => {
        coreProps = {
            bucket: {
                inputName: 'test-input-bucket',
                outputName: 'test-output-bucket',
                logName: 'test-log-bucket',
            },
            topic: {
                topicName: 'test-topic',
                emails: ['test-email@example.com'],
            },
            detectionFuncName: 'test-detect-sentiment-function',
            deletionFuncName: 'test-delete-object-function',
        };
        app = new cdk.App();
        stack = new CoreStack(app, 'Osenchi-Core', coreProps);
        template = Template.fromStack(stack);
    });
    // SNS
    test('have a SNS Topic with EMail Subscriptions', () => {
        template.hasResourceProperties('AWS::SNS::Topic', {
            TopicName: coreProps.topic.topicName,
        });
    });
    // S3
    test('have input buckets', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketName: coreProps.bucket.inputName,
        });
    });
    test('have output buckets', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketName: coreProps.bucket.outputName,
        });
    });
    test('have log buckets', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketName: coreProps.bucket.logName,
        });
    });
    // Lambda Function
    test('have detect-sentiment function', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            FunctionName: coreProps.detectionFuncName,
            Handler: 'index.handler',
        });
    });
    test('have delete-object function', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            FunctionName: coreProps.deletionFuncName,
            Handler: 'index.handler',
        });
    });
});

describe('Osenchi Validation tests', () => {
    const coreProps: ICoreProps = {
        bucket: {
            inputName: 'test-input-bucket',
            outputName: 'test-output-bucket',
            logName: 'test-log-bucket',
        },
        topic: {
            topicName: 'test-topic',
            emails: [' test-email@example.com'],
        },
        detectionFuncName: 'test-detect-sentiment-function',
        deletionFuncName: 'test-delete-object-function',
    };
    const app = new cdk.App();
    test('Validation test of Email', () => {
        expect(() => {
            new CoreStack(app, 'Osenchi-Core', coreProps);
        }).toThrowError('Email parameter is invalid.');
    });
});