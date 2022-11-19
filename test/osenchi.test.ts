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