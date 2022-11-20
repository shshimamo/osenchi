import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export class IamUserStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const accountId = cdk.Stack.of(this).account;
        const region = cdk.Stack.of(this).region;

        const codebuildRunPolicy = new iam.Policy(this, "codebuild-run", {
            policyName: "codebuild-run"
        })
        codebuildRunPolicy.addStatements(
            new iam.PolicyStatement({
                actions: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"],
                effect: iam.Effect.ALLOW,
                resources: [`arn:aws:codebuild:${region}:${accountId}:project/*`]
            })
        )
        codebuildRunPolicy.addStatements(
            new iam.PolicyStatement({
                actions: ["logs:GetLogEvents"],
                effect: iam.Effect.ALLOW,
                resources: [
                    `arn:aws:logs:${region}:${accountId}:log-group:/aws/codebuild/*:*`
                ]
            })
        )
        const user = new iam.User(this, "githubactions", {
            userName: "githubactions",
        })
        user.attachInlinePolicy(codebuildRunPolicy)
    }
}