import { JobExecutor } from './job-executor';

/**
 * ステート情報インタフェース
 *
 * @export
 * @interface IStateInfo
 */
export interface IStateInfo {
    Payload: Payload;
}

export interface Payload {
    id: string;
    srcBucket: string;
    objectKey: string;
    destBucket: string;
}

/**
 * S3オブジェクト削除用のLambda関数ハンドラ
 *
 * @export
 * @param {IStateInfo} event イベント情報
 * @returns {Promise<IStateInfo>}
 */
export async function handler(event: IStateInfo): Promise<IStateInfo> {
    console.log('event', event);
    console.log('event.srcBucket', event.Payload.srcBucket);
    console.log('event.objectKey', event.Payload.objectKey);
    await JobExecutor.execute(event.Payload.srcBucket, event.Payload.objectKey);
    return event;
}