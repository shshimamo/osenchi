import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions";
import { Context } from '../lib/common/context';
import { IamUserStack } from '../lib/core/iam-user-stack';

beforeAll(() => {
    Context.setEnvironment();
});

describe('iam-user Snapshot tests', () => {
    test('Snapshot tests', () => {
        const app = new cdk.App();
        const stack = new IamUserStack(app, 'Osenchi-Core');
        // スタックからテンプレート(JSON)を生成
        const template = Template.fromStack(stack).toJSON();
        expect(template).toMatchSnapshot();
    });
});
