import { Observable, ReplaySubject, EMPTY } from 'rxjs';

import { WebSocketRxJs } from '../../common/websocket-rxjs';
import { WebsocketRequest, WebsocketMessageResponse } from './coinbase-common.types';
import { websocketEndpoint } from './coinbase-common';

// normally the type in response message is the same to subscribed channel
// if it is different we have this to determine which channel the message belongs to
const typeChannelMap: { [key: string]: string } = {
  snapshot: 'level2',
  l2update: 'level2',
  match: 'matches',
};

export class CoinbaseWebsocket {
  private websocket: WebSocketRxJs<WebsocketMessageResponse> | null = null;
  private readonly keyStreamMap: { [key: string]: ReplaySubject<any> } = {};

  /**
   * allow only 1 product and 1 channel for each subscribe
   * @param subscribeRequest
   * {"type":"subscribe","product_ids":["BTC-USD"],"channels":["ticker"]}
   */
  subscribe<T>(subscribeRequest: WebsocketRequest): Observable<T> {
    if (!this.websocket) {
      this.initWebsocket();
    }

    if (subscribeRequest.type !== 'subscribe') {
      return EMPTY;
    }

    const key = getKeyFromRequest(subscribeRequest);
    if (!this.keyStreamMap[key] && this.websocket) {
      this.keyStreamMap[key] = new ReplaySubject<T>(1);
      this.websocket.send(JSON.stringify(subscribeRequest));
    }

    return this.keyStreamMap[key].asObservable();
  }

  /**
   *
   * @param unsubscribeRequest
   * {"type":"unsubscribe","product_ids":["BTC-USD"],"channels":["ticker"]}
   */
  unsubscribe(unsubscribeRequest: WebsocketRequest): void {
    if (!this.websocket) {
      return;
    }

    if (unsubscribeRequest.type !== 'unsubscribe') {
      return;
    }

    this.websocket.send(JSON.stringify(unsubscribeRequest));
    const key = getKeyFromRequest(unsubscribeRequest);
    // complete stream and delete
    if (this.keyStreamMap[key]) {
      this.keyStreamMap[key].complete();
      delete this.keyStreamMap[key];
    }
  }

  private initWebsocket(): void {
    if (this.websocket) {
      throw new Error('Coinbase websocket is already initialized');
    }

    this.websocket = new WebSocketRxJs(websocketEndpoint);
    this.websocket.message$.subscribe((response) => {
      if (response.type && response.product_id) {
        const key = getKeyFromResponse(response);
        if (this.keyStreamMap[key]) {
          this.keyStreamMap[key].next(response);
        }
      }
    });
  }
}

function getKeyFromRequest(request: WebsocketRequest): string {
  return request.channels[0] + request.product_ids[0];
}

function getKeyFromResponse(response: WebsocketMessageResponse): string {
  return (typeChannelMap[response.type] || response.type) + response.product_id;
}
