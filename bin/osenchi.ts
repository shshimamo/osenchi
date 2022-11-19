#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Context } from '../lib/common/context';
import { CoreProps } from '../lib/core/core-props';
import { CoreStack } from '../lib/core/core-stack';

if (Boolean(process.env.DEBUG)) {
    Context.setEnvironment();
}

const app = new cdk.App();
const props = CoreProps.fromContext(app.node);
new CoreStack(app, 'Osenchi-Core', props);