import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkDeployCodeBuildStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const buildImage = codebuild.LinuxBuildImage.fromDockerRegistry(
            "public.ecr.aws/bitnami/node:16.18.1"
        )
        const project = new codebuild.Project(this, "OsenchiProject", {
            projectName: "osenchi-cdk-deploy",
            environment: {
                buildImage
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        commands: [
                            'npm install -g aws-cdk',
                            "npm install",
                        ]
                    },
                    pre_build: {
                       commands: [
                           'cdk --version',
                           'cdk diff',
                       ]
                    },
                    build: {
                        commands: [
                            'npx cdk deploy --verbose --all --require-approval never'
                        ]
                    }
                }
            })
        })

        project.role?.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
        )
    }
}